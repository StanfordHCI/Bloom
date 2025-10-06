
import logging
import pytz
from datetime import datetime, timedelta, date
from typing import Optional
from backend.api.models import ChatState
from dateutil import parser

logger = logging.getLogger(__name__)

class PlanDateModule:
    
    @staticmethod
    async def determine_plan_dates(uid: str, chat_state: str, firebase_manager) -> tuple[datetime|None, datetime|None, str|None]:
        """
        Returns (start_dt, end_dt, error_message) or (None, None, error_message) if we must abort.
        """

        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)
        now_local = datetime.now(user_tz)
        weekday = now_local.weekday()  # Monday=0 ... Sunday=6

        plan_covering_today = await PlanDateModule.get_plan_doc_including_day(uid, now_local, firebase_manager)
        all_plan_docs = await firebase_manager.get_user_workout_plan_ids(uid)
        has_any_plan = len(all_plan_docs) > 0
        program_start = await PlanDateModule.get_program_start_date(uid, firebase_manager)

        if chat_state == ChatState.ONBOARDING.value:
            # If today is Sunday or Monday => plan starts THIS Sunday
            # Else => NEXT Sunday
            if weekday in [6, 0]:  # Sunday=6, Monday=0
                start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
            else:
                start_dt = PlanDateModule.get_next_weeks_sunday(now_local)
            end_dt = start_dt + timedelta(days=6)
            return (start_dt, end_dt, None)

        elif chat_state == ChatState.AT_WILL.value:
            if plan_covering_today:
                # plan doc containing today => start this week's Sunday
                start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
                end_dt   = start_dt + timedelta(days=6)
                return (start_dt, end_dt, None)
            else:
                # plan doc exists but not containing today => possibly user missed check-in
                if has_any_plan:
                    # check if programStartDate > now, that means user hasnt started their plan for onboarding
                    if program_start and program_start >= now_local.date():                        
                        if weekday in [6, 0]:  # Sunday=6, Monday=0
                            start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
                        else:
                            start_dt = PlanDateModule.get_next_weeks_sunday(now_local)
                        end_dt = start_dt + timedelta(days=6)
                        return (start_dt, end_dt, None)
                    else:
                        # Return an error that they must do a check-in first.
                        error_msg = (
                            "No plan covers today; you appear to have missed your check-in. "
                            "Please do a check-in before generating an at-will plan."
                        )
                        return (None, None, error_msg)
                else:
                    # no plan doc at all => fallback or treat as onboarding
                    start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
                    end_dt   = start_dt + timedelta(days=6)
                    return (start_dt, end_dt, None)

        elif chat_state == ChatState.CHECK_IN.value:
            return await PlanDateModule._handle_check_in(uid, now_local, weekday, plan_covering_today, firebase_manager)
            # # If plan doc containing today => next Sunday start
            # # else => partial plan from this Sunday
            # if plan_covering_today:
            #     if weekday in [4, 5]:  # Fri=4, Sat=5
            #         # Generate plan for next Sunday
            #         start_dt = PlanDateModule.get_next_weeks_sunday(now_local)
            #         end_dt   = start_dt + timedelta(days=6)
            #         return (start_dt, end_dt, None)     
            #     else:
            #         # Overwrite the existing plan with a plan for this Sunday
            #         start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
            #         end_dt   = start_dt + timedelta(days=6)
            #         return (start_dt, end_dt, None)                                           
            # else:
            #     # No plan covers today => partial plan from this Sunday
            #     start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
            #     end_dt   = start_dt + timedelta(days=6)
            # return (start_dt, end_dt, None)

        else:
            return (None, None, f"Invalid chat state: {chat_state}")

    @staticmethod
    async def _handle_check_in(
        uid: str,
        now_local: datetime,
        weekday: int,
        plan_covering_today: dict | None,
        firebase_manager
    ) -> tuple[datetime | None, datetime | None, str | None]:
        """
        Handles logic for ChatState.CHECK_IN:
        - If there's a plan covering today and it's Fri/Sat, check plan creation date vs. conversation start.
        - If plan creation < first_message_ts => next week's Sunday.
        - Else => this week's Sunday.
        - If no plan covers today => partial plan from this Sunday.
        """
        # If plan doc containing today => next Sunday or this Sunday, depending on creation date
        if plan_covering_today:
            plan_created_str = plan_covering_today.get("createdAt")
            plan_created_at = None
            if plan_created_str:
                try:
                    plan_created_at = parser.parse(plan_created_str, fuzzy=True)
                except Exception as e:
                    logger.warning(f"Could not parse plan creation date '{plan_created_str}': {e}")

            # Load the current check-in conversation to get first message timestamp
            session_id, annotated_history = await firebase_manager.load_conversation_history(uid, ChatState.CHECK_IN)
            conversation_first_ts = None
            if annotated_history:
                first_msg_ts_str = annotated_history[0].timestamp or ""
                try:
                    conversation_first_ts = parser.parse(first_msg_ts_str, fuzzy=True)
                except Exception as e:
                    logger.warning(f"Could not parse first message timestamp '{first_msg_ts_str}': {e}")

            # If it's Fri(4) or Sat(5), check plan creation date vs conversation start
            if weekday in [4, 5]:
                if plan_created_at and conversation_first_ts:
                    # Retrieve the user's timezone from Firebase
                    user_tz_str = await firebase_manager.get_user_timezone(uid)
                    user_tz = pytz.timezone(user_tz_str)                    
                    if plan_created_at.tzinfo is None:
                        plan_created_at = plan_created_at.replace(tzinfo=user_tz)
                    else:
                        plan_created_at = plan_created_at.astimezone(user_tz)
                    
                    if conversation_first_ts.tzinfo is None:
                        conversation_first_ts = conversation_first_ts.replace(tzinfo=user_tz)
                    else:
                        conversation_first_ts = conversation_first_ts.astimezone(user_tz)
                    
                    if plan_created_at < conversation_first_ts:
                        start_dt = PlanDateModule.get_next_weeks_sunday(now_local)
                    else:
                        start_dt = PlanDateModule.get_this_weeks_sunday(now_local)                    
                    if plan_created_at < conversation_first_ts:
                        start_dt = PlanDateModule.get_next_weeks_sunday(now_local)
                    else:
                        start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
                else:
                    # fallback if can't compare times => assume next week's Sunday
                    start_dt = PlanDateModule.get_next_weeks_sunday(now_local)
            else:
                # If not Fri or Sat, always generate from this Sunday
                start_dt = PlanDateModule.get_this_weeks_sunday(now_local)
        else:
            # If no plan covers today => partial plan from this Sunday
            start_dt = PlanDateModule.get_this_weeks_sunday(now_local)

        end_dt = start_dt + timedelta(days=6)
        return (start_dt, end_dt, None)

    @staticmethod
    def get_this_weeks_sunday(now_local: datetime) -> datetime:
        dow = now_local.weekday()  # Monday=0,...Sunday=6
        if dow == 6:
            return now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            return (now_local - timedelta(days=dow+1)).replace(hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def get_next_weeks_sunday(now_local: datetime) -> datetime:
        this_sun = PlanDateModule.get_this_weeks_sunday(now_local)
        return this_sun + timedelta(days=7)

    @staticmethod
    async def get_plan_doc_including_day(uid: str, date_local: datetime, firebase_manager) -> dict|None:
        plan_ids = await firebase_manager.get_user_workout_plan_ids(uid)
        if not plan_ids:
            return None
        plan_ids.sort(reverse=True)
        user_plans_ref = firebase_manager.get_user_doc_ref(uid).collection('plans')

        check_date = date_local.date()

        for pid in plan_ids:
            doc_ref = user_plans_ref.document(pid)
            snap = await doc_ref.get()
            if snap.exists:
                data = snap.to_dict()
                start_str = data.get("start")
                end_str   = data.get("end")
                if not start_str or not end_str:
                    continue
                try:
                    if len(start_str) == 10 and start_str[4] == '-':                        
                        st = datetime.fromisoformat(start_str).date()
                        en = datetime.fromisoformat(end_str).date()
                    else:
                        # "MM-DD-YYYY"
                        st = datetime.strptime(start_str, "%m-%d-%Y").date()
                        en = datetime.strptime(end_str, "%m-%d-%Y").date()
                except Exception:
                    continue

                if st <= check_date <= en:
                    return data
        return None

    @staticmethod
    async def get_program_start_date(uid: str, firebase_manager) -> Optional[date]:
        doc = await firebase_manager.get_user_doc_ref(uid).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        psd_value = data.get("programStartDate")
        if not psd_value:
            return None

        # 1) If Firestore returned a datetime or Timestamp, handle it directly
        if isinstance(psd_value, datetime):
            return psd_value.date()

        # 2) If it's a string, try ISO parse first
        if isinstance(psd_value, str):
            try:
                return datetime.fromisoformat(psd_value).date()
            except ValueError:
                # 3) fallback to old "MM-DD-YYYY" if that’s how you used to store it
                try:
                    return datetime.strptime(psd_value, "%m-%d-%Y").date()
                except Exception:
                    return None

        # 4) If it's some other type (like a dict), just return None or handle differently
        return None
