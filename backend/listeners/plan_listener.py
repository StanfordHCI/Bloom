import logging
import datetime
import pytz
from dateutil import parser
from tenacity import retry, stop_after_attempt, wait_random_exponential, before_sleep_log, after_log
from apscheduler.triggers.date import DateTrigger # type: ignore

from backend.modules.notification_module import PushNotificationModule
from backend.managers.firebase_manager import FirebaseManager
from backend.task_queue import TaskQueue

logger = logging.getLogger(__name__)
firebase_manager = FirebaseManager()
task_queue = TaskQueue()


class PlanListener:
    def __init__(self, user_doc_ref):
        self.user_doc_ref = user_doc_ref
        self.uid = user_doc_ref.id
        self.plans_collection_ref = self.user_doc_ref.collection("plans")
        self.setup_plan_listener()

    def setup_plan_listener(self):
        def on_plan_snapshot(doc_snapshots, changes, read_time):
            self.handle_plan_snapshot(doc_snapshots, changes, read_time)
        self.plans_collection_ref.on_snapshot(on_plan_snapshot)

    def handle_plan_snapshot(self, doc_snapshots, changes, read_time):
        logger.info(f"Received snapshot for user={self.uid} 'plans' subcollection.")
        for change in changes:
            plan_id = change.document.id
            plan_data = change.document.to_dict() or {}
            change_type = change.type.name

            if change_type in ("ADDED", "MODIFIED"):
                is_active = plan_data.get("isActive", False)
                if is_active:
                    logger.info(f"Plan {plan_id} for {self.uid} is ACTIVE => schedule notifications.")
                    self.remove_plan_notifications(plan_id)

                    try:
                        self._schedule_plan_notifications(plan_id, plan_data)
                    except ValueError as ve:
                        logger.error(f"Could not schedule plan {plan_id} for user {self.uid} due to invalid data: {ve}")
                else:
                    logger.info(f"Plan {plan_id} for {self.uid} is INACTIVE => remove notifications.")
                    self.remove_plan_notifications(plan_id)

            elif change_type == "REMOVED":
                logger.info(f"Plan {plan_id} for {self.uid} REMOVED => remove notifications.")
                self.remove_plan_notifications(plan_id)

        self.handle_checkin_notification()

    def remove_plan_notifications(self, plan_id: str):
        """
        Removes any scheduled notifications for this user's plan from both APScheduler
        and the notifications_index dictionary.
        """
        user_key = (self.uid, plan_id)
        job_ids = task_queue.notifications_index.get(user_key, set())
        for j in job_ids:
            task_queue.remove_task(j)
        task_queue.notifications_index[user_key].clear()

    @retry(
        reraise=True,
        before_sleep=before_sleep_log(logger, logging.INFO),
        after=after_log(logger, logging.INFO),
        wait=wait_random_exponential(multiplier=2, max=60),
        stop=stop_after_attempt(3),
    )
    def _schedule_plan_notifications(self, plan_id: str, plan_data: dict):
        try:
            tz_str = firebase_manager.get_sync_user_timezone(self.uid)
            user_tz = pytz.timezone(tz_str)
        except pytz.exceptions.UnknownTimeZoneError as tze:
            logger.error(f"Could not schedule plan notification for plan {plan_id} for user {self.uid}: Invalid timezone string {tz_str}. Error: {tze}")
            return # terminal error
        
        start_str = plan_data.get("start")
        if not start_str:
            logger.error(f"Plan {plan_id} for user {self.uid} has no 'start' date specified. Cannot schedule notifications.")
            return  # terminal error

        try:
            start_date = datetime.datetime.fromisoformat(start_str).date()
        except Exception as e:
            logger.error(f"Could not schedule plan notification for plan {plan_id} for user {self.uid}: Invalid start date: {start_str}. Error: {e}")
            return # terminal error

        now_local = datetime.datetime.now(user_tz)

        for i in range(7):
            day_dt = start_date + datetime.timedelta(days=i)
            date_str = day_dt.strftime("%Y-%m-%d")

            workouts = plan_data.get("workoutsByDay", {}).get(day_dt.strftime("%A"), [])
            earliest_local = None
            latest_local_end = None
            for w in workouts:
                try:
                    w_dt = parser.parse(w["timeStart"])
                    if w_dt.tzinfo is None:
                        naive_start = datetime.datetime.combine(day_dt, w_dt.time())
                        local_start = user_tz.localize(naive_start)
                    else:
                        local_start = w_dt.astimezone(user_tz)
                    duration = w.get("durationMin", 0)
                    local_end = local_start + datetime.timedelta(minutes=duration)
                except Exception:
                    logger.error(f"Could not parse workout time for user={self.uid}, plan={plan_id}, day={date_str} workout={w}")
                    continue

                if earliest_local is None or local_start < earliest_local:
                    earliest_local = local_start
                if latest_local_end is None or local_end > latest_local_end:
                    latest_local_end = local_end

            morning_job_id = f"morning_{self.uid}_{plan_id}_{date_str}"
            six_thirty_am = datetime.datetime.combine(day_dt, datetime.time(hour=6, minute=30))
            morning_default = user_tz.localize(six_thirty_am)

            if earliest_local:
                target_morning = min(morning_default, earliest_local - datetime.timedelta(hours=1))
            else:
                target_morning = morning_default

            if target_morning <= now_local:
                logger.info(f"Skipping morning notification for user={self.uid}, plan={plan_id} on {date_str}: scheduled time is in the past.")
            else:
                task_queue.add_task(
                    func=PushNotificationModule.morning_notification_job,
                    trigger=DateTrigger(run_date=target_morning),
                    args=[self.uid, plan_id, date_str],
                    job_id=morning_job_id
                )
                task_queue.notifications_index[(self.uid, plan_id)].add(morning_job_id)

            evening_job_id = f"evening_{self.uid}_{plan_id}_{date_str}"
            six_thirty_pm = datetime.datetime.combine(day_dt, datetime.time(hour=18, minute=30))
            evening_default = user_tz.localize(six_thirty_pm)
            if latest_local_end:
                target_evening = max(evening_default, latest_local_end)
            else:
                target_evening = evening_default

            if target_evening <= now_local:
                logger.info(f"Skipping evening notification for user={self.uid}, plan={plan_id} on {date_str}: scheduled time is in the past.")
            else:
                task_queue.add_task(
                    func=PushNotificationModule.evening_notification_job,
                    trigger=DateTrigger(run_date=target_evening),
                    args=[self.uid, plan_id, date_str],
                    job_id=evening_job_id
                )
                task_queue.notifications_index[(self.uid, plan_id)].add(evening_job_id)
            for w in workouts:
                workout_id = w.get("id")
                if not workout_id:
                    continue
                try:
                    w_dt = parser.parse(w["timeStart"])
                    if w_dt.tzinfo is None:
                        naive_start = datetime.datetime.combine(day_dt, w_dt.time())
                        local_start = user_tz.localize(naive_start)
                    else:
                        local_start = w_dt.astimezone(user_tz)
                    reminder_time = local_start + datetime.timedelta(minutes=w.get("durationMin", 0) + 15)
                except Exception:
                    logger.error(f"Could not parse workout time for user={self.uid}, plan={plan_id}, day={date_str} workout={w}. Skipping reminder.")
                    continue

                if reminder_time <= now_local:
                    logger.info(f"Skipping evening notification for user={self.uid}, plan={plan_id}, workout={w} on {date_str}: scheduled time is in the past.")
                    continue

                c_job_id = f"workout_{self.uid}_{plan_id}_{workout_id}"
                task_queue.add_task(
                    func=PushNotificationModule.workout_reminder_notification_job,
                    trigger=DateTrigger(run_date=reminder_time),
                    args=[self.uid, plan_id, workout_id],
                    job_id=c_job_id
                )
                task_queue.notifications_index[(self.uid, plan_id)].add(c_job_id)

    @retry(
        reraise=True,
        before_sleep=before_sleep_log(logger, logging.INFO),
        after=after_log(logger, logging.INFO),
        wait=wait_random_exponential(multiplier=2, max=60),
        stop=stop_after_attempt(3),
    )
    def handle_checkin_notification(self):
        """
        Check if there's a future checkinTime in user doc. If so, schedule notifications.
        """
        user_doc = self.user_doc_ref.get()
        user_data = user_doc.to_dict() or {}
        checkin_time_str = user_data.get("checkinTime")

        if not checkin_time_str:
            logger.warning(f"Missing checkinTime for user {self.uid}. Cannot schedule checkin notifications.")
            return

        checkin_time = datetime.datetime.fromisoformat(checkin_time_str)
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        if checkin_time > now_utc:
            self._schedule_checkin_notifications(checkin_time)

    @retry(
        reraise=True,
        before_sleep=before_sleep_log(logger, logging.INFO),
        after=after_log(logger, logging.INFO),
        wait=wait_random_exponential(multiplier=2, max=60),
        stop=stop_after_attempt(3),
    )
    def _schedule_checkin_notifications(self, checkin_dt: datetime.datetime):
        self._remove_checkin_jobs()  # clear old check-in jobs
        user_key = (self.uid, "checkin")

        base_times = [
            (checkin_dt, "initial"),
            (checkin_dt + datetime.timedelta(hours=3), "3h"),
            (checkin_dt + datetime.timedelta(hours=6), "6h"),
            (checkin_dt + datetime.timedelta(hours=12), "12h"),
            (checkin_dt + datetime.timedelta(hours=24), "24h"),
            (checkin_dt + datetime.timedelta(hours=48), "48h"),
        ]

        now_utc = datetime.datetime.now(datetime.timezone.utc)
        for (trigger_time, suffix) in base_times:
            if trigger_time <= now_utc:
                logger.info(f"Skipping checkin reminder '{suffix}' for user={self.uid}; time is in the past.")
                continue

            job_id = f"checkin_{self.uid}_{suffix}"
            task_queue.add_task(
                func=PushNotificationModule.checkin_reminder_job,
                trigger=DateTrigger(run_date=trigger_time),
                args=[self.uid],
                job_id=job_id
            )
            task_queue.notifications_index[user_key].add(job_id)

    def _remove_checkin_jobs(self):
        user_key = (self.uid, "checkin")
        job_ids = task_queue.notifications_index.get(user_key, set())
        for j in job_ids:
            task_queue.remove_task(j)
        task_queue.notifications_index[user_key].clear()