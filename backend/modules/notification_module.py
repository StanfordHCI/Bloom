from typing import Optional
import datetime
import json

from firebase_admin import messaging  # type: ignore
from google.cloud.firestore_v1.base_query import FieldFilter

from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_random_exponential
from apscheduler.triggers.date import DateTrigger  # type: ignore

from backend.llm.prompts import PromptLoader
from backend.llm.llm_provider import LLMProvider
from backend.modules.memory_module import MemoryModule
from backend.modules.plan_module import PlanModule
from backend.managers.firebase_manager import FirebaseManager
from backend.task_queue import TaskQueue
from backend.utils.date_utils import get_current_iso_datetime_str

import logging
logger = logging.getLogger(__name__)

firebase_manager = FirebaseManager()
task_queue = TaskQueue()
llm_client = LLMProvider.get_client()

class NotificationResponseModel(BaseModel):
    title: str
    body: str


class PushNotificationModule:
    @retry(stop=stop_after_attempt(5), wait=wait_random_exponential(multiplier=10, max=300), reraise=True)
    @staticmethod
    async def send_notification(
        uid: str,
        title: str,
        body: str,
        action: Optional[str] = None,
        notification_type: Optional[str] = None
    ) -> None:
        """
        Sends an FCM notification to a user through Firebase Cloud Messaging.
        """
        user_apns_token = await PushNotificationModule.get_apns_token(uid)
        logger.debug(f"APNs token found: {user_apns_token}")
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)

        sent_timestamp_string = get_current_iso_datetime_str()
        data_payload = {
            "sent_timestamp": sent_timestamp_string,
            "logs_path": user_doc_ref.path + "/notifications/" + sent_timestamp_string,
            "action": action or "OPEN_CHAT",
            "title": title,
            "body": body
        }

        if notification_type:
            data_payload["type"] = notification_type

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            data=data_payload,
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        mutable_content=True
                    )
                )
            ),
            token=user_apns_token
        )

        response = messaging.send(message)
        logger.info(f"Successfully sent FCM message: {response}")

        await PushNotificationModule.write_sent_message_log(
            uid, 
            sent_timestamp_string,
            silent=False,
            title=title,
            body=body,
            action=action or "OPEN_CHAT",
            notification_type=notification_type
        )
    
    @staticmethod
    @retry(stop=stop_after_attempt(5), wait=wait_random_exponential(multiplier=10, max=300), reraise=True)
    async def send_silent_update(uid: str) -> None:
        """
        Sends a silent push notification (content-available=1) to wake the iOS app in the background.
        """
        logger.info(f"Sending silent update to user {uid}.")
        user_apns_token = await PushNotificationModule.get_apns_token(uid)
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)

        sent_timestamp_string = get_current_iso_datetime_str()
        # Format of a silent notification request using firebase messaging
        message = messaging.Message(
            data={
                "silent": "true",
                "sent_timestamp": sent_timestamp_string,
                "logs_path": user_doc_ref.path + "/notifications/" + sent_timestamp_string
            },
            apns=messaging.APNSConfig(
                headers={
                    "apns-push-type": "background",
                    "apns-priority": "5"
                },
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        content_available=True,
                        mutable_content=True
                    )
                )
            ),
            token=user_apns_token
        )
        try:
            response = messaging.send(message)
        except Exception as e:
            logger.error(f"Failed to send silent update to user {uid}: {e}")
            raise
        
        logger.info(f"Silent update sent to user {uid} with response: {response}")
        await PushNotificationModule.write_sent_message_log(
            uid, 
            sent_timestamp_string, 
            silent=True,
            notification_type="silent"
        )

    @staticmethod
    async def get_apns_token(uid: str) -> str:
        """
        Retrieves a user's APNs token from their user document, or raises if not found.
        """
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        user_doc = await user_doc_ref.get()
        user_doc_dict = user_doc.to_dict()

        if not user_doc_dict:
            raise ValueError(f"User document not found for user ID: {uid}")
        if "apnsToken" not in user_doc_dict:
            raise ValueError(f"APNs token not found for user ID: {uid}")

        return user_doc_dict["apnsToken"]

    @staticmethod
    @retry(stop=stop_after_attempt(5), wait=wait_random_exponential(multiplier=10, max=300), reraise=True)
    async def write_sent_message_log(
        uid: str, 
        sent_timestamp_string: str, 
        silent: bool = False, 
        title: Optional[str] = None, 
        body: Optional[str] = None, 
        action: Optional[str] = None,
        notification_type: Optional[str] = None
    ):
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        new_log_doc = user_doc_ref.collection('notifications').document(sent_timestamp_string)
        
        data = {
            "sent": sent_timestamp_string,
            "silent": silent
        }
        if notification_type:
            data["type"] = notification_type

        user_snap = await user_doc_ref.get()
        user_data = user_snap.to_dict() or {}
        app_type = user_data.get("appType", None) 
        
        # default to treatment, since generatedByLLM field has no effect on control
        if not app_type:
            logger.warning(f"write_sent_message_log: no appType found for user {uid} => defaulting to 'treatment'.")
            app_type = "treatment"

        if not silent:
            data["title"] = title
            data["body"] = body
            data["action"] = action

            if app_type == "treatment" and notification_type in {"morning","evening","workout"}:
                data["generatedByLLM"] = True
                # store the message in user doc
                llm_msg = {
                    "title": title,
                    "body": body
                }
                await user_doc_ref.update({"llmMessage": llm_msg})
            else:
                data["generatedByLLM"] = False

        await new_log_doc.set(data, merge=True)
        logger.info(f"Notification log doc created at {new_log_doc.path}.")

    @staticmethod
    def schedule_notification(
        uid: str, 
        title: str, 
        body: str, 
        send_time: datetime.datetime, 
        action: Optional[str] = None, 
        job_id: Optional[str] = None
    ) -> None:
        """
        Schedule a notification to be sent at a specific time.
        """
        logger.debug(f"Scheduling notification for user {uid} scheduled at {send_time}.")
        
        if job_id is None:
            job_id = f"notification_{uid}_{send_time.isoformat()}"

        # Remove any existing job with the same ID to avoid duplicates
        if task_queue.scheduler.get_job(job_id):
            task_queue.remove_task(job_id)

        trigger = DateTrigger(run_date=send_time)
        task_queue.add_task(
            func=PushNotificationModule.send_notification,
            args=[uid, title, body, action],
            trigger=trigger,
            job_id=job_id
        )
        logger.info(f"Notification scheduled for user {uid} at {send_time.isoformat()} with job_id={job_id}")

    @staticmethod
    @retry(stop=stop_after_attempt(5), wait=wait_random_exponential(multiplier=10, max=300), reraise=True)
    async def morning_notification_job(uid: str, plan_id: str, date_str: str):
        logger.info(f"Morning notification job for user {uid} with plan {plan_id} on {date_str}.")
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        user_snap = await user_doc_ref.get()
        user_data = user_snap.to_dict() or {}
        condition = user_data.get("appType", None) 
        if not condition:
            logger.warning(f"User {uid} has no condition in user doc, skipping morning notification.")
            return

        plan_doc_ref = user_doc_ref.collection("plans").document(plan_id)

        plan_snapshot = await plan_doc_ref.get()
        if not plan_snapshot.exists:
            logger.warning(f"Plan {plan_id} for user {uid} no longer exists, skipping morning notification.")
            return

        plan_data = plan_snapshot.to_dict() or {}
        if not plan_data.get("isActive", False):
            logger.warning(f"Plan {plan_id} for user {uid} is now inactive, skipping morning notification.")
            return

        title, body = await PushNotificationModule._build_morning_notification_text(uid, condition, date_str, plan_data)
        logger.info(f"Morning notification text: {title} - {body}")
        await PushNotificationModule.send_notification(uid, title, body, notification_type="morning")

    @staticmethod
    @retry(stop=stop_after_attempt(5), wait=wait_random_exponential(multiplier=10, max=300), reraise=True)
    async def evening_notification_job(uid: str, plan_id: str, date_str: str):
        logger.info(f"Evening notification job for user {uid} with plan {plan_id} on {date_str}.")
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        user_snap = await user_doc_ref.get()
        user_data = user_snap.to_dict() or {}
        condition = user_data.get("appType", None) 
        if not condition:
            logger.warning(f"User {uid} has no condition in user doc, skipping evening notification.")
            return
        
        plan_doc_ref = user_doc_ref.collection("plans").document(plan_id)

        plan_snapshot = await plan_doc_ref.get()
        if not plan_snapshot.exists:
            logger.warning(f"Plan {plan_id} for user {uid} no longer exists, skipping evening notification.")
            return

        plan_data = plan_snapshot.to_dict() or {}
        if not plan_data.get("isActive", False):
            logger.warning(f"Plan {plan_id} for user {uid} is now inactive, skipping evening notification.")
            return

        title, body = await PushNotificationModule._build_evening_notification_text(uid, condition, date_str, plan_data)
        logger.info(f"Evening notification text: {title} - {body}")
        await PushNotificationModule.send_notification(uid, title, body, notification_type="evening")

    @staticmethod
    @retry(stop=stop_after_attempt(5), wait=wait_random_exponential(multiplier=10, max=300), reraise=True)
    async def workout_reminder_notification_job(uid: str, plan_id: str, workout_id: str):
        logger.info(f"Workout reminder notification job for user {uid} with plan {plan_id} and workout {workout_id}.")
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        user_snap = await user_doc_ref.get()
        user_data = user_snap.to_dict() or {}
        condition = user_data.get("appType", None) 
        if not condition:
            logger.warning(f"User {uid} has no condition in user doc, skipping workout notifications.")
            return
        
        plan_doc_ref = user_doc_ref.collection("plans").document(plan_id)

        plan_snapshot = await plan_doc_ref.get()
        if not plan_snapshot.exists:
            logger.warning(f"Plan {plan_id} for user {uid} no longer exists, skipping workout reminder notification.")
            return

        plan_data = plan_snapshot.to_dict() or {}
        if not plan_data.get("isActive", False):
            logger.warning(f"Plan {plan_id} for user {uid} is now inactive, skipping workout notification.")
            return

        workouts_by_day = plan_data.get("workoutsByDay", {})
        workout = None
        for _, workout_list in workouts_by_day.items():
            if not workout_list:
                continue
            for w in workout_list:
                if w.get("id") == workout_id:
                    workout = w
                    break
            if workout:
                break
        
        if not workout:
            logger.warning(f"Workout {workout_id} not found in plan {plan_id} for user {uid}, skipping workout notification.")
            return

        title, body = await PushNotificationModule._build_workout_reminder_text(uid, condition, workout, plan_data)
        logger.info(f"Workout reminder notification text: {title} - {body}")
        await PushNotificationModule.send_notification(uid, title, body, notification_type="workout")

    @staticmethod
    @retry(stop=stop_after_attempt(5), wait=wait_random_exponential(multiplier=10, max=300), reraise=True)
    async def checkin_reminder_job(uid: str):
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        user_snap = await user_doc_ref.get()

        if not user_snap.exists:
            logger.warning(f"User doc {uid} not found, skipping checkin notification.")
            return

        user_data = user_snap.to_dict() or {}
        checkin_str = user_data.get("checkinTime")
        if not checkin_str:
            logger.warning(f"No checkinTime for user {uid}, skipping checkin notification.")
            return

        c_dt = datetime.datetime.fromisoformat(checkin_str)
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        if c_dt > now_utc:
            logger.info("checkinTime is ahead of current time => user done with checkin.")
            return

        title = "It’s time for your weekly check-in!"
        body = "Click here to create your plan for the upcoming week."

        await PushNotificationModule.send_notification(uid, title, body, notification_type="check-in")

    @staticmethod
    async def _build_morning_notification_text(uid: str, condition: str, date_str: str, plan_data: dict) -> tuple[str, str]:
        logger.info(f"Building morning notification text for user {uid} with condition {condition} on {date_str}.")
        if condition == "treatment":
            return await PushNotificationModule._treatment_morning_text(uid, plan_data, date_str)
        elif condition == "control":
            return PushNotificationModule._control_morning_text(plan_data, date_str)
        else:
            logger.error(f"_build_morning_notification_text: unknown condition={condition}")
            raise ValueError(f"Unknown condition={condition}")

    @staticmethod
    async def _build_evening_notification_text(uid: str, condition: str, date_str: str, plan_data: dict) -> tuple[str, str]:
        logger.info(f"Building evening notification text for user {uid} with condition {condition} on {date_str}.")
        if condition == "treatment":
            return await PushNotificationModule._treatment_evening_text(uid, plan_data, date_str)
        elif condition == "control":
            return PushNotificationModule._control_evening_text(plan_data, date_str)
        else:
            logger.error(f"_build_evening_notification_text: unknown condition={condition}")
            raise ValueError(f"Unknown condition={condition}")

    @staticmethod
    async def _build_workout_reminder_text(uid: str, condition: str, workout_obj: dict, plan_data: dict) -> tuple[str, str]:
        logger.info(f"Building workout reminder text for user {uid} with condition {condition} for workout {workout_obj.get('id')}.")
        if condition == "treatment":
            return await PushNotificationModule._treatment_workout_text(uid, workout_obj, plan_data)
        elif condition == "control":
            return PushNotificationModule._control_workout_text(workout_obj)
        else:
            logger.error(f"_build_workout_reminder_text: unknown condition={condition}")
            raise ValueError(f"Unknown condition={condition}")

    @staticmethod
    async def _treatment_morning_text(uid: str, plan_data: dict, date_str: str) -> tuple[str, str]:
        """
        LLM-based morning notification text.
        """
        conversation_summaries = await MemoryModule.retrieve_memory(uid)
        plan_history = await PlanModule.get_weekly_plan_history(uid)
        
        last_10_msgs = await PushNotificationModule._fetch_last_10_llm_notifications(uid)
        last_10_text = "\n".join(last_10_msgs) if last_10_msgs else "No recent LLM notifications."

        day_name = datetime.datetime.fromisoformat(date_str).strftime("%A")
        workouts_by_day = plan_data.get("workoutsByDay", {})
        todays_workouts = workouts_by_day.get(day_name, [])

        if todays_workouts:
            todays_workouts_list = []
            for w in todays_workouts:
                w_type = w.get("type")
                w_start = w.get("timeStart")
                todays_workouts_list.append(f"Workout: {w_type} scheduled at time: {w_start}")
            todays_workout_text = ", ".join(todays_workouts_list)
        else:
            todays_workout_text = "No workouts scheduled for today."

        tz_str = await firebase_manager.get_user_timezone(uid)
        
        prompt_str = PromptLoader.morning_notification_prompt(
            timezone_str=tz_str,
            summaries=conversation_summaries,
            plan_history=plan_history,
            last_10_notifications=last_10_text,
            todays_workouts=todays_workout_text
        )

        try:
            result: NotificationResponseModel = await llm_client.chat_completion_structured(
                messages=[{"role": "system", "content": prompt_str}],
                response_format=NotificationResponseModel
            )
            return result.title, result.body
        except Exception as e:
            logger.error(f"LLM text generation for morning notification failed for {uid} => fallback to control. Error: {e}")
            return PushNotificationModule._control_morning_text(plan_data, date_str)

    @staticmethod
    async def _treatment_evening_text(uid: str, plan_data: dict, date_str: str) -> tuple[str, str]:
        """
        LLM-based evening notification text.
        """
        conversation_summaries = await MemoryModule.retrieve_memory(uid)
        plan_history = await PlanModule.get_weekly_plan_history(uid)

        last_10_msgs = await PushNotificationModule._fetch_last_10_llm_notifications(uid)
        last_10_text = "\n".join(last_10_msgs) if last_10_msgs else "No recent LLM notifications."

        day_name = datetime.datetime.fromisoformat(date_str).strftime("%A")
        workouts_by_day = plan_data.get("workoutsByDay", {})
        todays_workouts = workouts_by_day.get(day_name, [])
        
        if todays_workouts:
            todays_workouts_list = []
            for w in todays_workouts:
                w_type = w.get("type")
                w_start = w.get("timeStart")
                w_completed = w.get("completed", False)
                todays_workouts_list.append(f"Workout: {w_type} at time: {w_start}, completed: {w_completed}")
            todays_workout_text = ", ".join(todays_workouts_list)
        else:
            todays_workout_text = "No workouts scheduled today."

        tz_str = await firebase_manager.get_user_timezone(uid)

        prompt_str = PromptLoader.evening_notification_prompt(
            timezone_str=tz_str,
            summaries=conversation_summaries,
            plan_history=plan_history,
            last_10_notifications=last_10_text,
            todays_workouts=todays_workout_text
        )

        try:
            result: NotificationResponseModel = await llm_client.chat_completion_structured(
                messages=[{"role": "system", "content": prompt_str}],
                response_format=NotificationResponseModel
            )
            return result.title, result.body
        except Exception as e:
            logger.error(f"LLM text generation for evening notification failed for {uid} => fallback to control. Error: {e}")
            return PushNotificationModule._control_evening_text(plan_data, date_str)

    @staticmethod
    async def _treatment_workout_text(uid: str, workout_obj: dict, plan_data: dict) -> tuple[str, str]:
        """
        LLM-based workout reminder text. If the workout is completed, 
        we want a celebratory message; else a gentle reminder or alternative.
        """
        conversation_summaries = await MemoryModule.retrieve_memory(uid)
        plan_history = await PlanModule.get_weekly_plan_history(uid)

        last_10_msgs = await PushNotificationModule._fetch_last_10_llm_notifications(uid)
        last_10_text = "\n".join(last_10_msgs) if last_10_msgs else "No recent LLM notifications."


        workout_str = json.dumps(workout_obj)
        timezone_str = await firebase_manager.get_user_timezone(uid)

        prompt_str = PromptLoader.workout_reminder_prompt(
            timezone_str=timezone_str,
            summaries=conversation_summaries,
            plan_history=plan_history,
            last_10_notifications=last_10_text,
            workout_info=workout_str
        )

        try:
            result: NotificationResponseModel = await llm_client.chat_completion_structured(
                messages=[{"role": "system", "content": prompt_str}],
                response_format=NotificationResponseModel
            )
            return (result.title, result.body)
        except Exception as e:
            logger.error(f"LLM text generation for workout reminder failed for {uid} => fallback to control. Error: {e}")
            return PushNotificationModule._control_workout_text(workout_obj)

    @staticmethod
    def _control_morning_text(plan_data: dict, date_str: str) -> tuple[str, str]:
        title = "Good Morning!"
        day_name = datetime.datetime.fromisoformat(date_str).strftime("%A")
        workouts_by_day = plan_data.get("workoutsByDay", {})
        todays_workouts = workouts_by_day.get(day_name, [])

        if todays_workouts:
            items = []
            for w in todays_workouts:
                w_type = w.get("type")
                w_start = w.get("timeStart")

                if not w_type or not w_start:
                    logger.error(f"Control morning text: missing type or timeStart in workout {w} for plan {plan_data.get('id')}")
                    continue

                w_start = datetime.datetime.fromisoformat(w_start).strftime("%I:%M%p").lstrip('0').lower()

                if w_type and w_start:
                    items.append((w_type, w_start))
                else:
                    logger.warning(f"Control morning text: missing type or timeStart in workout {w} for plan {plan_data.get('id')}")

            items = sorted(items, key=lambda x: x[1])
            item_strings = [f"{w[0]} workout at {w[1]}" for w in items]
            
            if len(item_strings) == 1:
                body = f"Remember your {item_strings[0]} today."
            else:
                if len(item_strings) == 2:
                    joined = " and ".join(item_strings)
                else:
                    joined = ", ".join(item_strings[:-1]) + " and " + item_strings[-1]
                body = f"Remember your {joined} today."
        else:
            body = "Enjoy your rest day today."

        return title, body

    @staticmethod
    def _control_evening_text(plan_data: dict, date_str: str) -> tuple[str, str]:
        title = "Good Evening!"
        day_name = datetime.datetime.fromisoformat(date_str).strftime("%A")
        workouts_by_day = plan_data.get("workoutsByDay", {})
        todays_workouts = workouts_by_day.get(day_name, [])

        if not todays_workouts:
            body = "Hope you had a nice rest day. Click here to review your plan for tomorrow."
            return title, body

        completed = [w for w in todays_workouts if w.get("completed") is True]
        not_completed = [w for w in todays_workouts if not w.get("completed")]

        if len(completed) > 0:
            items = []
            for w in completed:
                w_type = w.get("type")
                w_start = w.get("timeStart")

                if not w_type or not w_start:
                    logger.error(f"Control evening text: missing type or timeStart in workout {w} for plan {plan_data.get('id')}")
                    continue

                w_start = datetime.datetime.fromisoformat(w_start).strftime("%I:%M%p").lstrip('0').lower()

                if w_type and w_start:
                    items.append((w_type, w_start))
                else:
                    logger.warning(f"Control evening text: missing type or timeStart in workout {w} for plan {plan_data.get('id')}")

            items = sorted(items, key=lambda x: x[1])
            item_strings = [f"{w[0]} workout at {w[1]}" for w in items]
                
            if len(item_strings) == 1:
                body = f"Great job completing your {item_strings[0]}!"
            else:
                if len(item_strings) == 2:
                    joined = " and ".join(item_strings)
                else:
                    joined = ", ".join(item_strings[:-1]) + " and " + item_strings[-1]
                body = f"Great job completing your {joined}!"
            
            body += " Click here to review your plan for tomorrow."
            return title, body

        elif len(not_completed) > 0:
            items = []
            for w in not_completed:
                w_type = w.get("type")
                w_start = w.get("timeStart")

                if not w_type or not w_start:
                    logger.error(f"Control evening text: missing type or timeStart in workout {w} for plan {plan_data.get('id')}")
                    continue

                w_start = datetime.datetime.fromisoformat(w_start).strftime("%I:%M%p").lstrip('0').lower()

                if w_type and w_start:
                    items.append((w_type, w_start))
                else:
                    logger.warning(f"Control evening text: missing type or timeStart in workout {w} for plan {plan_data.get('id')}")

            items = sorted(items, key=lambda x: x[1])
            item_strings = [f"{w[0]} workout at {w[1]}" for w in items]

            if len(item_strings) == 1:
                body = f"How was your {item_strings[0]}? Click here to mark it complete or reschedule."
            else:
                if len(item_strings) == 2:
                    joined = " and ".join(item_strings)
                else:
                    joined = ", ".join(item_strings[:-1]) + " and " + item_strings[-1]
                body = f"How was your {joined}? Click here to mark them complete or reschedule."
            return title, body
        else:
            # fallback if we get some edge case
            body = "Hope you had a good day! Click here to review your plan for tomorrow."
            return title, body

    @staticmethod
    def _control_workout_text(workout_obj: dict) -> tuple[str, str]:
        completed = workout_obj.get("completed")
        w_type = workout_obj.get("type")
        w_start = workout_obj.get("timeStart")

        if not w_type or not w_start:
            logger.error(f"Control workout reminder text: missing type or timeStart in workout {workout_obj}")
            raise ValueError(f"Control workout reminder text: missing type or timeStart in workout {workout_obj}")
        
        w_start = datetime.datetime.fromisoformat(w_start).strftime("%I:%M%p").lstrip('0').lower()

        if completed:
            title = "Hey, it’s Beebo!"
            body = f"Great job finishing your {w_type} workout at {w_start}!"
        else:
            title = "Hey, it’s Beebo!"
            body = f"How was your {w_type} workout at {w_start}? Click here to mark it as complete or reschedule."
        return title, body


    @staticmethod
    async def _fetch_last_10_llm_notifications(uid: str) -> list[str]:
        """
        Returns the last 10 notifications (title+body) that were generated by LLM 
        for this user, sorted descending by 'sent'.
        """
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        notifications_ref = user_doc_ref.collection("notifications")
        q = (
            notifications_ref
            .where(filter=FieldFilter("generatedByLLM", "==", True))
            .order_by("sent", direction="DESCENDING")
            .limit(10)
        )

        docs = [doc async for doc in q.stream()]
        messages = []
        for nd in docs:
            notif_dict = nd.to_dict()
            title = notif_dict.get("title")
            body = notif_dict.get("body")
            sent = notif_dict.get("sent")
            type = notif_dict.get("type")
            messages.append(f"{sent} [{type}]:\n{title}\n{body}")
        return messages
