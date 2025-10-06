import logging
import pytz
import json
from enum import Enum
from uuid import uuid4
from pydantic import BaseModel, Field
from typing import Optional, List, Tuple
from datetime import datetime, timedelta, time

from backend.api.models import ChatState
from backend.modules.date_module import PlanDateModule
from backend.llm.models import AnnotatedMessage
from backend.llm.prompts import PromptLoader
from backend.llm.llm_provider import LLMProvider
from backend.utils import date_utils
from dateutil import parser

from backend.managers.firebase_manager import FirebaseManager
from backend.task_queue import TaskQueue
from backend.utils.plan_utils import get_all_user_plans_sorted, get_plan_history, sanitize_plan_history
task_queue = TaskQueue()

logger = logging.getLogger(__name__)

llm_client = LLMProvider.get_client()
firebase_manager = FirebaseManager()

# 1) Define your list of valid workout types as a Python list or tuple
VALID_WORKOUT_TYPES = [
    "walking",
    "running",
    "american football",
    "archery",
    "australian football",
    "badminton",
    "baseball",
    "basketball",
    "bowling",
    "boxing",
    "climbing",
    "cricket",
    "cross training",
    "curling",
    "cycling",
    "dance",
    "dance inspired training",
    "elliptical",
    "equestrian sports",
    "fencing",
    "fishing",
    "functional strength training",
    "golf",
    "gymnastics",
    "handball",
    "hiking",
    "hockey",
    "hunting",
    "lacrosse",
    "martial arts",
    "mind and body",
    "mixed metabolic cardio training",
    "paddle sports",
    "play",
    "preparation and recovery",
    "racquetball",
    "rowing",
    "rugby",
    "sailing",
    "skating sports",
    "snow sports",
    "soccer",
    "softball",
    "squash",
    "stair climbing",
    "surfing sports",
    "swimming",
    "table tennis",
    "tennis",
    "track and field",
    "traditional strength training",
    "volleyball",
    "water fitness",
    "water polo",
    "water sports",
    "wrestling",
    "yoga",
    "barre",
    "core training",
    "cross country skiing",
    "downhill skiing",
    "flexibility",
    "high intensity interval training",
    "jump rope",
    "kickboxing",
    "pilates",
    "snowboarding",
    "stairs",
    "step training",
    "wheelchair walk pace",
    "wheelchair run pace",
    "tai chi",
    "mixed cardio",
    "hand cycling",
    "disc sports",
    "fitness gaming",
    "cardio dance",
    "social dance",
    "pickleball",
    "cooldown",
    "swim bike run",
    "transition"
]

# 2) Build a helper string to insert into your Field’s description 
WORKOUT_TYPES_DESCRIPTION = (
    "The type of activity for this workout. "
    "Must be exactly one of the following:\n  - "
    + "\n  - ".join(VALID_WORKOUT_TYPES)
)


class Intensity(Enum):
    "The workout's intensity, determined by target HR or the talk test."
    light = "light"
    moderate = "moderate"
    vigorous = "vigorous"

class Workout(BaseModel):
    """
    A workout object containing details about a given workout.
    """
    id: Optional[str] = Field(None, description="A unique ID for this workout.") 
    type: str = Field(..., description=WORKOUT_TYPES_DESCRIPTION)
    location: Optional[str] = Field(None, description="An optional description of the location. Only include if the user describes a specific location.")
    completed: bool = Field(..., description="A flag marking whether the workout is completed. It should always be set to false on first generation.")
    intensity: Intensity
    timeStart: str = Field(..., description="Exact time of day that the workout should start, in a 'hh:mm tt' format (e.g., 6:30 AM, 4:00 PM).")
    durationMin: float = Field(..., description="How many minutes the workout lasts")
    isPlanWorkout: bool = Field(..., description="Whether workout is part of generated plan. By default, this is True. Only set to False if modifying an existing plan.")
    isHKWorkout: bool = Field(..., description="Whether workout came from HealthKit. By default, this is False. Only set to True if modifying an existing workout.")

class WorkoutsByDay(BaseModel):
    """
    Object containing workouts by weekdays. Each day contains a list of workout objects.
    """
    Sunday: Optional[List[Workout]] = Field(..., description="Workouts for Sunday or null if the day has passed.")
    Monday: Optional[List[Workout]] = Field(..., description="Workouts for Monday or null if the day has passed.")
    Tuesday: Optional[List[Workout]] = Field(..., description="Workouts for Tuesday or null if the day has passed.")
    Wednesday: Optional[List[Workout]] = Field(..., description="Workouts for Wednesday or null if the day has passed.")
    Thursday: Optional[List[Workout]] = Field(..., description="Workouts for Thursday or null if the day has passed.")
    Friday: Optional[List[Workout]] = Field(..., description="Workouts for Friday or null if the day has passed.")
    Saturday: Optional[List[Workout]] = Field(..., description="Workouts for Saturday or null if the day has passed.")

class WeeklyPlan(BaseModel):
    rationale: Optional[str] = Field(..., description="A description of important factors to consider for scheduling this user's workout plan.")
    start: str = Field(..., description="ISO-8601 formatted date string, e.g. 'YYYY-MM-DD'. The start date must be a Sunday.")
    end: str = Field(..., description="ISO-8601 formatted date string, e.g. 'YYYY-MM-DD'. The end date must be a Saturday.")
    workoutsByDay: WorkoutsByDay = Field(..., description="Dictionary of workouts by weekdays.")
    revision: Optional[str] = Field(..., description="A message indicating any revisions made to the plan.")
    isActive: bool = Field(..., description="A flag indicating whether the plan is active or not.")


class PlanModule:
    @staticmethod
    def compute_plan_progress(plan_data: dict) -> dict:
        """
        Given a plan dictionary, compute high-level progress statistics about its workouts.
        """
        workouts_by_day = plan_data.get("workoutsByDay") or {}
        if not workouts_by_day:
            return {
                "total_workouts": 0,
                "completed_workouts": 0,
                "completion_percentage": 0.0,
                "workout_types": [],
                "unique_workout_types": 0,
                "total_duration_min": 0,
                "avg_duration_min": 0.0,
                "intensity_counts": {}
            }

        # Flatten all workouts across the days
        day_order = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
        all_workouts = []
        for day in day_order:
            wks = workouts_by_day.get(day, [])
            if wks:
                all_workouts.extend(wks)

        if not all_workouts:
            return {
                "total_workouts": 0,
                "completed_workouts": 0,
                "completion_percentage": 0.0,
                "workout_types": [],
                "unique_workout_types": 0,
                "total_duration_min": 0,
                "avg_duration_min": 0.0,
                "intensity_counts": {}
            }

        total_workouts = len(all_workouts)
        completed_workouts = sum(1 for w in all_workouts if w.get("completed") is True and w.get("isPlanWorkout") is True)
        completion_percentage = round(100.0 * completed_workouts / total_workouts, 1)

        workout_types = [w.get("type", "Unknown") for w in all_workouts]
        unique_workout_types = len(set(workout_types))

        durations = [w.get("durationMin", 0) for w in all_workouts]
        total_duration = sum(durations)
        avg_duration = round(total_duration / total_workouts, 1)

        intensity_counts = {} # type: ignore
        for w in all_workouts:
            intensity_key = w.get("intensity", "Unknown")
            intensity_counts[intensity_key] = intensity_counts.get(intensity_key, 0) + 1

        return {
            "total_workouts": total_workouts,
            "completed_workouts": completed_workouts,
            "completion_percentage": completion_percentage,
            "workout_types": workout_types,
            "unique_workout_types": unique_workout_types,
            "total_duration_min": total_duration,
            "avg_duration_min": avg_duration,
            "intensity_counts": intensity_counts
        }

    @staticmethod
    async def get_plan_progress_statistics(uid: str) -> dict:
        """
        Fetch the most recent plan doc for this user and compute progress stats.
        If no plan is found, returns {"error": "..."}.
        """
        plan_ids = await firebase_manager.get_user_workout_plan_ids(uid)
        if not plan_ids:
            return {"error": "No weekly workout plan found for this user."}

        # Sort in descending => pick the most recent
        plan_ids.sort(reverse=True)
        most_recent_plan_id = plan_ids[0]

        user_plans_ref = firebase_manager.get_user_doc_ref(uid).collection("plans")
        snap = await user_plans_ref.document(most_recent_plan_id).get()
        if not snap.exists:
            return {"error": f"Plan doc {most_recent_plan_id} not found."}

        plan_data = snap.to_dict() or {}
        stats = PlanModule.compute_plan_progress(plan_data)
        stats["planId"] = most_recent_plan_id
        return stats

    @staticmethod
    def format_plan_stats(stats: dict) -> str:
        """
        Convert the stats dictionary into a human-readable multiline string.
        """
        if "error" in stats:
            return f"Error retrieving stats: {stats['error']}"
        
        lines = []
        lines.append(f"Plan ID: {stats.get('planId','N/A')}")
        lines.append(f"Total Workouts: {stats['total_workouts']}")
        lines.append(f"Completed Workouts: {stats['completed_workouts']}")
        lines.append(f"Completion Percentage: {stats['completion_percentage']}%")
        lines.append(f"Unique Workout Types: {stats['unique_workout_types']}")
        lines.append(f"Total Duration (min): {stats['total_duration_min']}")
        lines.append(f"Avg Duration (min): {stats['avg_duration_min']}")
        lines.append("Intensity Distribution:")
        intensity = stats.get("intensity_counts", {})
        for intensity_level, count in intensity.items():
            lines.append(f"  - {intensity_level}: {count}")
        return "\n".join(lines)

    @staticmethod
    def format_plan_summary(plan_data: dict) -> str:
        """
        Return a concise multiline text describing this plan:
        doc_id, plan_source, isActive, start/end, revision, stats
        """
        doc_id = plan_data.get("doc_id", "Unknown")
        plan_source = plan_data.get("plan_source", "Unknown")
        is_active = plan_data.get("isActive", False)
        start = plan_data.get("start") or plan_data.get("start_date")
        end   = plan_data.get("end")   or plan_data.get("end_date")
        revision = plan_data.get("plan_revision") or plan_data.get("revision") or "(no revision)"

        stats = PlanModule.compute_plan_progress(plan_data)

        lines = []
        lines.append(f"Plan Doc ID: {doc_id}")
        lines.append(f"Source: {plan_source}")
        lines.append(f"Is Active: {is_active}")
        lines.append(f"Start/End: {start} -> {end}")
        lines.append(f"Revision Notes: {revision}")
        lines.append("Progress Stats:")
        lines.append(f"  Total Workouts: {stats['total_workouts']}")
        lines.append(f"  Completed: {stats['completed_workouts']}")
        lines.append(f"  Completion %: {stats['completion_percentage']}")
        lines.append(f"  Total Duration (min): {stats['total_duration_min']}")
        lines.append(f"  Avg Duration (min): {stats['avg_duration_min']}")
        lines.append(f"  Unique Workout Types: {stats['unique_workout_types']}")
        lines.append(f"  Intensity Distribution: {stats['intensity_counts']}")
        return "\n".join(lines)

    @staticmethod
    async def get_all_user_plans(uid: str) -> list[dict]:
        """
        Fetch all plan documents for the user from Firestore.
        Each returned dict has:
            - doc_id
            - created_at (parsed from plan doc if available)
            - start_date, end_date (parsed from plan['start'], plan['end'])
            - plan_source, isActive, revision, etc.
        Returns an empty list if none are found.
        """

        user_plans_ref = firebase_manager.get_user_doc_ref(uid).collection("plans")
        docs = [doc async for doc in user_plans_ref.stream()]
        plan_docs: list[dict] = []

        for snap in docs:
            if not snap.exists:
                continue
            p = snap.to_dict() or {}
            pid = snap.id
            p["doc_id"] = pid

            # If your doc data includes "created_at" as an ISO string, parse it
            if isinstance(p.get("created_at"), str):
                try:
                    p["created_at"] = datetime.fromisoformat(p["created_at"].replace("Z",""))
                except Exception as e:
                    logger.warning(f"Cannot parse created_at for doc {pid}: {e}")
                    p["created_at"] = datetime.min
            else:
                # fallback if missing
                p["created_at"] = datetime.min

            # Parse start/end as date objects
            start_str = p.get("start")
            if isinstance(start_str, str):
                try:
                    p["start_date"] = datetime.fromisoformat(start_str).date()
                except Exception:
                    p["start_date"] = None
            end_str = p.get("end")
            if isinstance(end_str, str):
                try:
                    p["end_date"] = datetime.fromisoformat(end_str).date()
                except Exception:
                    p["end_date"] = None
            
            plan_docs.append(p)

        return plan_docs

    @staticmethod
    async def get_current_week_active_plan(uid: str) -> Optional[WeeklyPlan]:
        """
        Retrieve the current active plan for the user, or the upcoming plan if the program has not started.
        """
        plans = await get_all_user_plans_sorted(uid)
        plans = await sanitize_plan_history(uid, plans)
        active_plans = [p for p in plans if p.get("isActive", False)]
        if not active_plans:
            return None
            
        _, current_plan_dict, __, upcoming_plan_dict = get_plan_history(uid, active_plans)

        if current_plan_dict is not None:
            # Pydantic model validation will fail if the fields are missing
            # even though they are optional
            if "rationale" not in current_plan_dict:
                current_plan_dict["rationale"] = None
            if "revision" not in current_plan_dict:
                current_plan_dict["revision"] = None

            for workout in current_plan_dict.get("workoutsByDay", {}).values():
                for w in workout:
                    if w.get('isHKWorkout') is None:
                        w['isHKWorkout'] = False
                    if w.get('isPlanWorkout') is None:
                        w['isPlanWorkout'] = True

            try:
                return WeeklyPlan.model_validate(current_plan_dict)
            except Exception as e:
                logger.error(f"Failed to parse current_plan into WeeklyPlan: {e}")
                return None

        if upcoming_plan_dict is not None:
            if "rationale" not in upcoming_plan_dict:
                upcoming_plan_dict["rationale"] = None
            if "revision" not in upcoming_plan_dict:
                upcoming_plan_dict["revision"] = None
            try:
                return WeeklyPlan.model_validate(upcoming_plan_dict)
            except Exception as e:
                logger.error(f"Failed to parse upcoming_plan into WeeklyPlan: {e}")
                return None

        logger.error("No current or upcoming plan found.")
        return None


    @staticmethod
    async def get_weekly_plan_history(uid: str) -> str:
        """
        Returns a multi-line string capturing each week's plan history in the format:

        # Week 1
        ## Initial Plan <-- (onboarding final plan in week 1, full JSON included)
        ## Revisions
        ## Final Plan <-- (the final plan in week 1, full JSON included)
        ## Plan Statistics

        # Week 2
        ## Initial Plan <-- (check-in final plan in week 2, full JSON included)
        ## Revisions
        ## Final Plan <-- (the final plan in week 2, full JSON included)
        ## Plan Statistics

        ...and so on...
        """
        # 1) Get user's programStartDate
        user_doc = await firebase_manager.get_user_doc_ref(uid).get()
        if not user_doc.exists:
            return "No user doc found."

        user_data = user_doc.to_dict() or {}
        psd_str = user_data.get("programStartDate")
        if not psd_str:
            return "No 'programStartDate' found in user doc."

        try:
            program_start_date = datetime.fromisoformat(psd_str).date()
        except ValueError:
            # fallback parse if needed (mm-dd-yyyy)
            program_start_date = datetime.strptime(psd_str, "%m-%d-%Y").date()

        # 2) Fetch all plans
        all_plans = await PlanModule.get_all_user_plans(uid)
        if not all_plans:
            return "No plans found."

        # 3) Find the maximum end_date among all plans
        valid_end_dates = [p["end_date"] for p in all_plans if p["end_date"] is not None]
        if not valid_end_dates:
            return "No valid end dates on user plans."
        max_end_date = max(valid_end_dates)

        lines = []
        week_count = 1
        week_start = program_start_date

        # 4) Iterate from programStartDate up to max_end_date, in weekly increments
        while week_start <= max_end_date:
            week_end = week_start + timedelta(days=6)

            # find all plans that start and end exactly in [week_start, week_end]
            plans_for_week = [
                p for p in all_plans
                if p["start_date"] == week_start and p["end_date"] == week_end
            ]

            if plans_for_week:
                # sort ascending => the last item is the final plan
                plans_for_week.sort(key=lambda x: x["created_at"])
                
                # partition
                onboarding_or_check_in = [
                    p for p in plans_for_week
                    if p.get("plan_source") in (ChatState.ONBOARDING.value, ChatState.CHECK_IN.value)
                ]
                at_will = [
                    p for p in plans_for_week
                    if p.get("plan_source") == ChatState.AT_WILL.value
                ]

                # initial plan => last ([-1]) from onboarding or check_in
                initial_plan = onboarding_or_check_in[-1] if onboarding_or_check_in else None

                # revisions => gather revision texts from the at_will plans
                revision_texts = [p.get("revision") or "No revision notes." for p in at_will]

                # final plan => last in ascending order
                final_plan = plans_for_week[-1]

                # stats => from final_plan
                stats = PlanModule.compute_plan_progress(final_plan) if final_plan else {
                    "total_workouts": 0,
                    "completed_workouts": 0,
                    "completion_percentage": 0.0,
                    "unique_workout_types": 0,
                    "total_duration_min": 0,
                    "avg_duration_min": 0.0,
                    "intensity_counts": {}
                }

                # build the text
                lines.append(f"# Week {week_count}\n")

                lines.append("## Initial Plan")
                if initial_plan:
                    # 1) The summary
                    lines.append(PlanModule.format_plan_summary(initial_plan))

                    # 2) The *full JSON* for the initial plan
                    lines.append("```json")
                    lines.append(json.dumps(initial_plan, indent=2, default=str))
                    lines.append("```")                
                else:
                    lines.append("No onboarding or check-in plan found for this week.")
                lines.append("")

                lines.append("## Revisions")
                if revision_texts:
                    for i, rtxt in enumerate(revision_texts, start=1):
                        lines.append(f"- Revision #{i}: {rtxt}")
                else:
                    lines.append("No revisions for this week.")
                lines.append("")

                lines.append("## Final Plan")
                if final_plan:
                    # 1) The summary
                    lines.append(PlanModule.format_plan_summary(final_plan))

                    # 2) The *full JSON* for the final plan
                    lines.append("```json")
                    lines.append(json.dumps(final_plan, indent=2, default=str))
                    lines.append("```")                    
                else:
                    lines.append("No final plan found for this week.")
                lines.append("")

                lines.append("## Plan Statistics")
                lines.append(PlanModule.format_plan_stats(stats))
                lines.append("")

            # next week
            week_count += 1
            week_start = week_end + timedelta(days=1)

        return "\n".join(lines)    
    
            
    @staticmethod
    async def generate_plan(uid: str, chat_history: list[AnnotatedMessage], memory: str, chat_state: str, start_date: str, end_date: str, retries=0) -> Tuple[Optional[WeeklyPlan], str]:
        if retries > 3:
            logger.error("Failed to generate a weekly plan after 3 attempts.")
            return (None, "Failed to generate a weekly plan after multiple attempts.")
        
        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)
        today = datetime.now(user_tz)
        
        logger.info(f"Generating weekly plan. Today is {date_utils.verbose_date(today)}")

        # if this_week:
        #     sunday = PlanModule.get_this_weeks_sunday(today)
        # else:
        #     # Next week's Sunday is this Sunday + 7 days
        #     sunday = PlanModule.get_this_weeks_sunday(today) + timedelta(days=7)
                    
        # saturday = sunday + timedelta(days=6)       
        # 
        plan_history = await PlanModule.get_weekly_plan_history(uid) 
        
        system_prompt = PromptLoader.plan_generation_prompt(today, start_date, end_date, chat_history, memory, chat_state, plan_history)
        messages = [{"role": "system", "content": system_prompt}]

        try:
            weekly_plan: WeeklyPlan = await llm_client.chat_completion_structured(
                messages=messages,
                response_format=WeeklyPlan
            )            
            logger.info("Generated weekly plan")            
            # weekly_plan = await PlanModule.validate_weekly_plan(uid, weekly_plan, chat_state)
            
            # logger.info("Validated weekly plan")
        except Exception:
            logger.exception("Failed to generate weekly plan")
            return await PlanModule.generate_plan(uid, chat_history, memory, chat_state, start_date, end_date, retries + 1)
        
        corrected_plan, revision_msg = await PlanModule.correct_weekly_plan(
            uid, weekly_plan, chat_state, start_date, end_date
        )

        if corrected_plan:
            # Ensure all workouts have IDs exactly once
            PlanModule.assign_workout_ids(corrected_plan)
            # Now they won't change in future serializations
            return (corrected_plan, revision_msg)
        else:
            logger.error("Error generating plan for user %s", uid)
            return (None, revision_msg)    


    @staticmethod
    async def find_active_plan_given_chat_state(uid: str, chat_state: str) -> Optional[WeeklyPlan]:
        """
        First get the official plan dates using the date module and then return the active plan for that date range.
        If chat state is 'AT_WILL', simply return the current week's active plan.
        """
        # If the user is in 'AT_WILL' chat state, simply return the active plan for the current week.
        if chat_state == ChatState.AT_WILL.value:
            return await PlanModule.get_current_week_active_plan(uid)
        
        # 1) Get the official plan start and end dates using the date module
        start_dt, end_dt, error_msg = await PlanDateModule.determine_plan_dates(uid, chat_state, firebase_manager)
        if error_msg or not start_dt or not end_dt:
            logger.warning(f"Could not determine plan dates for chat_state={chat_state}: {error_msg}")
            return None
        
        # Convert the computed dates to date-only strings (YYYY-MM-DD)
        desired_start_str = start_dt.strftime("%Y-%m-%d")
        desired_end_str   = end_dt.strftime("%Y-%m-%d")
        
        # 2) Fetch all user plans
        all_plans = await get_all_user_plans_sorted(uid)
        all_plans = await sanitize_plan_history(uid, all_plans)
        active_plans = [p for p in all_plans if p.get("isActive", False)]
        
        if not active_plans:
            return None
        
        # 3) Filter active plans that exactly match the computed date range
        matching_plans = [
            p for p in active_plans
            if p.get("start", "") == desired_start_str and 
            p.get("end", "") == desired_end_str
        ]
        
        if not matching_plans:
            logger.info(f"No active plan found for chat_state={chat_state} with desired date range {desired_start_str} - {desired_end_str}.")
            return None
        
        # Select the first matching plan document
        selected_plan_doc = matching_plans[0]
        
        # 4) Set defaults for workouts and required fields
        workouts_by_day = selected_plan_doc.get("workoutsByDay", {})
        for day_list in workouts_by_day.values():
            if not isinstance(day_list, list):
                continue
            for w in day_list:
                if w.get("isPlanWorkout") is None:
                    w["isPlanWorkout"] = True
                if w.get("isHKWorkout") is None:
                    w["isHKWorkout"] = False
        try:
            if "doc_id" not in selected_plan_doc:
                selected_plan_doc["doc_id"] = "(unknown)"
            if "rationale" not in selected_plan_doc:
                selected_plan_doc["rationale"] = None
            if "revision" not in selected_plan_doc:
                selected_plan_doc["revision"] = None

            candidate_plan = WeeklyPlan.model_validate(selected_plan_doc)
            return candidate_plan
        except Exception as e:
            logger.error(f"Failed to parse WeeklyPlan from selected_plan_doc: {e}")
            return None
        
        
    @staticmethod
    async def add_workout(
        uid: str,
        day: str,
        workout_type: str,
        time_start: str,
        duration_min: float,
        chat_state: str,
        intensity: Optional[str] = None,
        location: Optional[str] = None
    ) -> Tuple[Optional[WeeklyPlan], str]:
        """
        Adds a workout to the current active plan for the specified day, 
        without calling the LLM.
        Only day, workout_type, time_start, and duration_min are required.
        intensity and location are optional. If intensity is not given, default to 'moderate'.
        """
                
        # active_plan = await PlanModule.get_current_week_active_plan(uid)    
        if chat_state != ChatState.AT_WILL.value:
            active_plan = await PlanModule.find_active_plan_given_chat_state(uid, chat_state)
        else:
            active_plan = await PlanModule.get_current_week_active_plan(uid)
        
        if not active_plan:
            return (None, "No active plan found.")
        
        day_workouts = getattr(active_plan.workoutsByDay, day, None) or []            
        
        # Default intensity to 'moderate' if not provided.
        final_intensity = intensity if intensity else "moderate"
        
        # Attempt to parse the intensity enum
        try:
            intensity_enum = Intensity(final_intensity)
        except ValueError:
            # If the string doesn't match a valid Intensity, default to 'moderate'
            intensity_enum = Intensity.moderate

        # Create a new workout object.
        new_workout = Workout(
            id=None,  # A unique ID will be asigned below
            type=workout_type,
            location=location,
            completed=False,
            intensity=intensity_enum,  
            timeStart=time_start,
            durationMin=duration_min,
            isPlanWorkout=True,
            isHKWorkout=False
        )

        logger.info(f"Adding new workout: {new_workout} to day {day} in the active plan {active_plan}")
        
        # Append the new workout to this day's list.
        day_workouts.append(new_workout)
        setattr(active_plan.workoutsByDay, day, day_workouts)

        # Assign new IDs as needed.
        PlanModule.assign_workout_ids(active_plan)
        
        return (active_plan, "Added new workout successfully.")

    @staticmethod
    def parse_time_str(time_str: str) -> Optional[time]:
        """
        Parse a time string (e.g., '6:30 AM') into a time object.
        Returns None if parsing fails.
        """
        try:
            dt = parser.parse(time_str, fuzzy=True)
            return dt.time()
        except Exception:
            return None
    
    @staticmethod
    async def delete_workout(uid: str, day: str, workout_type: str, chat_state: str, workout_time: Optional[str] = None) -> Tuple[Optional[WeeklyPlan], str]:
        """
        Deletes a workout from the current active plan by matching the day, workout type, and optionally the start time.
        """
        
        # active_plan = await PlanModule.get_current_week_active_plan(uid)    
        if chat_state != ChatState.AT_WILL.value:
            active_plan = await PlanModule.find_active_plan_given_chat_state(uid, chat_state)
        else:
            active_plan = await PlanModule.get_current_week_active_plan(uid)
                    
        if not active_plan:
            return (None, "No active plan found.")
        
        # Retrieve workouts for the specified day
        workouts = getattr(active_plan.workoutsByDay, day, []) or []
        
        # Filter workouts by type (case-insensitive)
        matching_workouts = [w for w in workouts if w.type.lower() == workout_type.lower()]
        
        # If a workout_time is provided, narrow down the match using parsed time objects
        if workout_time:
            requested_time = PlanModule.parse_time_str(workout_time)
            if requested_time is None:
                return (None, f"Cannot parse the requested workout time: {workout_time}")
            matching_workouts = [w for w in matching_workouts if PlanModule.parse_time_str(w.timeStart) == requested_time]
        
        if not matching_workouts:
            return (None, f"No workout found on {day} with type '{workout_type}'" + (f" at {workout_time}" if workout_time else ""))
        
        if len(matching_workouts) > 1:
            return (None, f"Multiple workouts found on {day} with type '{workout_type}'" + (f" at {workout_time}" if workout_time else "") + ". Please provide additional details.")
        
        workout_to_delete = matching_workouts[0]

        logger.info(f"Deleting workout: {workout_to_delete} from day {day} in the active plan {active_plan}")
        
        # Remove the identified workout
        new_workouts = [w for w in workouts if w.id != workout_to_delete.id]
        setattr(active_plan.workoutsByDay, day, new_workouts)
                
        return (active_plan, "Workout deleted successfully.")
                    

    @staticmethod
    async def correct_weekly_plan(uid: str, plan: WeeklyPlan, chat_state: str, desired_start: str, desired_end: str) -> Tuple[Optional[WeeklyPlan], str]:
        """
        Attempts to fix date range mismatch, past workouts, etc.
        Calls specialized methods for each chat state if needed.
        Returns (corrected_plan, revision_message). If unfixable => (None, reason).
        """
        revision_message = ""

        # Parse plan's stated start/end
        try:
            plan_start_dt = datetime.fromisoformat(plan.start)
            plan_end_dt = datetime.fromisoformat(plan.end)
        except ValueError:
            return (None, "Cannot parse plan's start or end date as ISO.")
        

        desired_start_dt = datetime.fromisoformat(desired_start)
        desired_end_dt   = datetime.fromisoformat(desired_end)
        

        # Force the official date range if mismatch
        if plan_start_dt.date() != desired_start_dt.date() or plan_end_dt.date() != desired_end_dt.date():
            old_range = f"{plan.start} - {plan.end}"
            new_range = f"{desired_start_dt} - {desired_end_dt}"
            revision_message += f"Adjusted plan date range from {old_range} to {new_range}.\n"

            plan.start = desired_start # isoformat
            plan.end   = desired_end  # isoformat

        # Now run the state-specific correction
        if chat_state == ChatState.ONBOARDING.value:
            corrected_plan, msg = await PlanModule.correct_onboarding_plan(uid, plan)
            if not corrected_plan:
                return (None, msg)
            revision_message += msg

        elif chat_state == ChatState.AT_WILL.value:
            corrected_plan, msg = await PlanModule.correct_at_will_plan(uid, plan)
            if not corrected_plan:
                return (None, msg)
            revision_message += msg

        elif chat_state == ChatState.CHECK_IN.value:
            corrected_plan, msg = await PlanModule.correct_check_in_plan(uid, plan)
            if not corrected_plan:
                return (None, msg)
            revision_message += msg
        else:
            # If unknown chat state => we might just do a fallback or discard
            return (None, f"Unknown chat state: {chat_state}")

        if not plan:
            return (None, revision_message)

        return (plan, revision_message)
    
    @staticmethod
    def count_workouts(plan: WeeklyPlan) -> int:
        count = 0
        for day_list in plan.workoutsByDay.model_dump().values():
            if day_list is not None:
                count += len(day_list)
        return count    
    
    @staticmethod
    async def correct_onboarding_plan(uid: str, plan: WeeklyPlan) -> Tuple[Optional[WeeklyPlan], str]:
        """
        Onboarding logic:
        - Must not schedule workouts in the past.
        - Set programStartDate in firebase if not set (or override).
        """
        revision_msg = ""
        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)
        now_local = datetime.now(user_tz)

        # Ensure no workouts in the past
        
        removed_count = await PlanModule.ensure_no_past_workouts(uid, plan, now_local)
        if removed_count > 0:
            revision_msg += f"Removed {removed_count} past workout(s) in your plan.\n"

        # If your design wants to discard the plan if it ends up with no workouts, do:
        total_workouts = PlanModule.count_workouts(plan)
        if total_workouts == 0:
            return (None, "No future workouts remain; discarding the plan.")
        
        # Set programStartDate
        try:
            user_doc_ref = firebase_manager.get_user_doc_ref(uid)
            await user_doc_ref.set({"programStartDate": plan.start}, merge=True)
        except Exception as e:
            revision_msg += f"(Could not set programStartDate: {e})"

        return (plan, revision_msg)
    
    @staticmethod
    async def correct_at_will_plan(uid: str, plan: WeeklyPlan) -> Tuple[Optional[WeeklyPlan], str]:
        """
        At-will logic:
        - If there's an existing plan for this same week, do not modify workouts older than 24h (locked).
        - If the LLM changed or removed a locked workout, we restore it to the final plan (instead of discarding).
        - We keep any new or updated workouts that are not locked.
        """
        revision_message = ""
        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)
        now_local = datetime.now(user_tz)

        # Check if there's an existing plan doc for the same start/end
        old_plan_doc = await PlanModule.get_existing_plan_for_same_week(uid, plan)
        if not old_plan_doc:
            # No old plan for the same range => we can proceed freely
            return (plan, revision_message)

        old_wbd = old_plan_doc.get("workoutsByDay", {})
        new_wbd = plan.workoutsByDay.model_dump()
        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

        # We will build a merged structure. Start by copying the "new" plan’s structure.
        merged_wbd = {}
        for day in day_names:
            merged_wbd[day] = new_wbd.get(day, []) or []

        # For each day, compare the old workouts to see which are locked
        for i, day in enumerate(day_names):
            old_workouts = old_wbd.get(day, [])
            # We'll track “locked” old workouts and see if they appear in the new plan
            for old_wkt in old_workouts:
                old_dt = PlanModule.parse_local_workout_datetime(uid, plan.start, i, old_wkt.get("timeStart", ""))
                if not old_dt:
                    # If we cannot parse the old workout's time, skip it
                    continue
                
                hours_since = (now_local - old_dt).total_seconds() / 3600.0
                if hours_since >= 24:
                    # This is a "locked" workout
                    # 1) See if there is a matching workout in the new plan
                    new_day_workouts = merged_wbd[day]

                    match_index = -1
                    for idx, new_wkt in enumerate(new_day_workouts):
                        is_match = PlanModule.find_matching_workout(old_wkt, [new_wkt])
                        if is_match:
                            match_index = idx
                            break

                    if match_index == -1:
                        # The LLM removed the locked workout, so we re-insert it
                        new_day_workouts.append(old_wkt)
                        revision_message += (
                            f"Restored locked workout on {day} at {old_wkt.get('timeStart')} "
                            f"(it was removed in the new plan).\n"
                        )
                    else:
                        # The LLM might have changed some fields, so we restore them
                        # We only restore the "locked" fields that cannot change.
                        # Example: "type", "timeStart", "durationMin", "intensity", "location"
                        locked_fields = ["type", "timeStart", "durationMin", "intensity", "location"]
                        for field in locked_fields:
                            if new_day_workouts[match_index].get(field) != old_wkt.get(field):
                                # restore old field
                                revision_message += (
                                    f"Reverted locked field '{field}' for workout on {day}, time={old_wkt.get('timeStart')}.\n"
                                )
                                new_day_workouts[match_index][field] = old_wkt.get(field)

                    # Save changes
                    merged_wbd[day] = new_day_workouts

        # Attach the merged structure back to the plan by constructing a new WorkoutsByDay object from merged_wbd        
        try:
            updated_wbd = WorkoutsByDay.model_validate(merged_wbd)
            plan.workoutsByDay = updated_wbd
        except Exception as e:
            return (None, f"Failed to merge locked workouts: {str(e)}")

        return (plan, revision_message)

    @staticmethod
    async def correct_check_in_plan(uid: str, plan: WeeklyPlan) -> Tuple[Optional[WeeklyPlan], str]:
        """
        Check-in logic:
        - If there's a plan doc containing 'today', we scheduled next Sunday
        - If no plan containing today, partial for this Sunday
        - By now, we forced the date range. Just ensure no workouts are in the past.
        """
        revision_message = ""
        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)
        now_local = datetime.now(user_tz)

        try:
            await PlanModule.ensure_no_past_workouts(uid, plan, now_local)
        except Exception as e:
            return (None, f"Discarding plan (check_in): {e}")

        return (plan, revision_message)

    @staticmethod
    async def ensure_no_past_workouts(uid: str, plan: WeeklyPlan, now_local: datetime) -> int:
        """
        Raise an exception if any workout is in the past. 
        If you wanted to "shift" them forward, you’d do it here. 
        """
        plan_start_date = datetime.fromisoformat(plan.start).date()
        day_order = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
        wbd = plan.workoutsByDay.model_dump()

        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)
        
        removed_count = 0

        for i, day_name in enumerate(day_order):
            daily_wkts = wbd.get(day_name, []) or []
            filtered_workouts = []
            day_dt = plan_start_date + timedelta(days=i)
            for w in daily_wkts:
                time_str = w.get("timeStart","")
                if not time_str:
                    continue
                try:
                    dt = parser.parse(time_str, fuzzy=True)
                    t = dt.time().replace(tzinfo=None)
                except Exception:
                    removed_count += 1
                    raise ValueError(f"Invalid time format: {time_str}")

                naive_dt = datetime.combine(day_dt, t)
                local_dt = user_tz.localize(naive_dt)

                # If the workout is in the future or exactly now, we keep it
                if local_dt >= now_local:
                    filtered_workouts.append(w)
                else:
                    removed_count += 1
                    logging.info(f"Removing past workout on {day_name} at {time_str}.")

            wbd[day_name] = filtered_workouts
        
        # Re-validate the updated structure back into a WorkoutsByDay
        plan.workoutsByDay = WorkoutsByDay.model_validate(wbd)   
        return removed_count             

    @staticmethod
    async def get_existing_plan_for_same_week(uid: str, new_plan: WeeklyPlan) -> dict|None:
        """
        Try to find an existing plan with the same start/end as new_plan.
        Return that doc data or None if not found.
        """
        plan_ids = await firebase_manager.get_user_workout_plan_ids(uid)
        if not plan_ids:
            return None

        new_start = new_plan.start
        new_end   = new_plan.end

        user_plans_ref = firebase_manager.get_user_doc_ref(uid).collection('plans')
        for pid in plan_ids:
            snap = await user_plans_ref.document(pid).get()
            if snap.exists:
                d = snap.to_dict()
                if d.get("start") == new_start and d.get("end") == new_end:
                    return d
        return None

    @staticmethod
    def find_matching_workout(old_wkt: dict, new_workouts: list[dict]) -> dict|None:
        """
        Identify the same workout by signature (type, timeStart, durationMin, intensity, location).
        """
        old_sig = (
            old_wkt.get("type"),
            old_wkt.get("timeStart"),
            old_wkt.get("durationMin"),
            old_wkt.get("intensity"),
            old_wkt.get("location"),
        )
        for w in new_workouts:
            new_sig = (
                w.get("type"),
                w.get("timeStart"),
                w.get("durationMin"),
                w.get("intensity"),
                w.get("location"),
            )
            if new_sig == old_sig:
                return w
        return None

    @staticmethod
    def parse_local_workout_datetime(uid: str, plan_start: str, day_index: int, time_str: str) -> datetime|None:
        """
        Convert plan_start + day offset + time_str to a local datetime, or None if parse fails.
        plan_start is "MM-DD-YYYY" in this example.
        """
        try:
            base_date = datetime.strptime(plan_start, "%m-%d-%Y").date()
        except Exception:
            return None
        try:
            t = parser.parse(time_str, fuzzy=True).time()
        except Exception:
            return None

        dt_naive = datetime.combine(base_date + timedelta(days=day_index), t)
        # For brevity, we won't re-localize here (you might do so if needed).
        return dt_naive
    
    @staticmethod
    def assign_workout_ids(plan: WeeklyPlan) -> None:
        """
        Assign a unique ID to each workout if it doesn't already have one.
        This should be called once immediately after the LLM generates or corrects a plan.
        """
        day_order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        for day_name in day_order:
            day_workouts = getattr(plan.workoutsByDay, day_name, None)
            if day_workouts is not None:
                for workout in day_workouts:
                    if workout.id is None:
                        workout.id = str(uuid4())    
    
    @staticmethod
    def convert_time_str_to_local_iso(
        plan_start_date_str: str,
        day_name: str,
        time_str: str,
        user_tz: pytz.BaseTzInfo
    ) -> str:
        """
        Convert either a plain 'hh:mm AM/PM' time_str or an ISO 8601 datetime (with or without offset)
        into a local ISO datetime in the user's timezone.
        If time_str lacks a date/offset, we use plan_start_iso + day_name to figure out the date,
        then localize it. If time_str already has a date/timezone, we just convert it to user_tz.
        """
        # Map day to offset from the plan's start date
        DAY_TO_INDEX = {
            "Sunday": 0,
            "Monday": 1,
            "Tuesday": 2,
            "Wednesday": 3,
            "Thursday": 4,
            "Friday": 5,
            "Saturday": 6
        }

        plan_start = datetime.fromisoformat(plan_start_date_str)  # e.g. "2025-01-27"
        day_offset = DAY_TO_INDEX.get(day_name, 0)
        base_date_for_day = plan_start + timedelta(days=day_offset)

        try:
            # 1) Try to parse the entire string with dateutil
            parsed = parser.parse(time_str)

            if parsed.tzinfo is None:
                # => user gave us a naive time (e.g. "6:30 AM", or "18:00") with no date or offset
                # We'll combine that time with base_date_for_day, then localize to user_tz
                t = parsed.time()
                naive_dt = datetime.combine(base_date_for_day.date(), t)
                local_dt = user_tz.localize(naive_dt)
                return local_dt.isoformat()
            else:
                # => user gave us a fully qualified datetime with tz (e.g. "2025-01-27T18:00:00-08:00")
                # so we just convert it to user_tz (ignoring plan_start/day_name)
                local_dt = parsed.astimezone(user_tz)
                return local_dt.isoformat()

        except (ValueError, TypeError):
            # 2) If for some reason dateutil can’t parse, fallback or raise a more direct error
            raise ValueError(f"Cannot parse '{time_str}' as either 12-hour time or ISO datetime.")
    
    @staticmethod
    def serialize_plan(plan_dict: dict, user_tz: pytz.tzinfo.BaseTzInfo) -> dict:
        # plan_dict["start"] = datetime.strptime(plan_dict["start"], "%m-%d-%Y").isoformat()
        # plan_dict["end"] = datetime.strptime(plan_dict["end"], "%m-%d-%Y").isoformat()

        workouts_by_day: dict = plan_dict["workoutsByDay"]
        for day, workouts in workouts_by_day.items():
            if not workouts:
                continue
            for workout in workouts:
                workout["intensity"] = workout["intensity"].value
                if "timeStart" in workout and workout["timeStart"]:
                    iso_time = PlanModule.convert_time_str_to_local_iso(
                        plan_dict["start"],
                        day,
                        workout["timeStart"],
                        user_tz
                    )
                    workout["timeStart"] = iso_time
                
    
        plan_dict["workoutsByDay"] = workouts_by_day
        return plan_dict
    
    @staticmethod
    async def save_plan(uid: str, plan: WeeklyPlan, chat_state: str, revision_message: str = ""):
    
            # 1. Retrieve the user’s time zone
        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)

    
        doc_data = PlanModule.serialize_plan(plan.model_dump(), user_tz)
        doc_data["plan_source"] = chat_state
        doc_data["plan_correction_message"] = revision_message
        doc_data["isActive"] = True
        
        # 2) Parse the new plan’s start/end dates
        try:
            new_plan_start_date = datetime.fromisoformat(plan.start).date()
            new_plan_end_date   = datetime.fromisoformat(plan.end).date()
        except Exception as e:
            logging.error(f"[save_plan] Cannot parse new plan's start/end: {e}")
            # If parsing fails, but we still want to save, at least mark it active
            new_plan_start_date = None
            new_plan_end_date   = None

        # 3) Determine 'today' in the user's timezone (for marking past plans)
        # user_tz_str = await firebase_manager.get_user_timezone(uid)
        # user_tz = pytz.timezone(user_tz_str)        
    
        # 4) Fetch all existing plan docs for the user, inactivate if needed
        user_plans_ref = firebase_manager.get_user_doc_ref(uid).collection('plans')
        existing_plan_ids = await firebase_manager.get_user_workout_plan_ids(uid)
        
        for pid in existing_plan_ids:
            plan_doc_ref = user_plans_ref.document(pid)
            snap = await plan_doc_ref.get()
            if not snap.exists:
                continue

            old_plan_data = snap.to_dict() or {}
            if not old_plan_data.get("isActive", False):
                # If it's already inactive, skip
                continue

            old_start_str = old_plan_data.get("start", "")
            old_end_str   = old_plan_data.get("end", "")

            try:
                old_start = datetime.fromisoformat(old_start_str).date()
                old_end = datetime.fromisoformat(old_end_str).date()
            except Exception as e:
                logging.warning(f"Could not parse old plan's date range for plan {pid}: {e}")
                # If we can't parse dates, we inactivate it to avoid duplicates
                await plan_doc_ref.update({"isActive": False})
                continue

            # A) If the old plan ended before today -> inactivate it        
            if (old_start == new_plan_start_date) and (old_end == new_plan_end_date):
                logging.info(f"Plan {pid} olverlaps with the new plan => inactivate it.") 
                await plan_doc_ref.update({"isActive": False})
                continue

            # B) Check for overlap. Overlap if:
            #    old_start <= new_end  AND  old_end >= new_start
            if new_plan_start_date and new_plan_end_date:
                overlap = (
                    old_start <= new_plan_end_date and
                    old_end   >= new_plan_start_date
                )
                if overlap:
                    logging.info(f"Plan {pid} overlaps with the new plan => inactivate it.")
                    await plan_doc_ref.update({"isActive": False})
                    continue

        # 5) Now that old conflicting or past plans are inactivated, save the new plan
        current_iso_time = datetime.now().isoformat()
        timestamp_str = current_iso_time[:23] + "Z"
        plan_doc_id = f"plan-{timestamp_str}"        
        doc_data['createdAt'] = current_iso_time

        plan_doc_ref = user_plans_ref.document(plan_doc_id)
        await plan_doc_ref.set(doc_data)
        
        # # store programStartDate from the onboarding plans
        # if chat_state == ChatState.ONBOARDING.value:            
        #     plan_start_date = plan.start  # "MM-DD-YYYY"
            
        #     user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        #     await user_doc_ref.set(
        #         {
        #             "programStartDate": plan_start_date
        #         },
        #         merge=True
        #     )
        logging.info(f"Successfully saved weekly plan for user {uid} with ID {plan_doc_id}.")

    @staticmethod
    async def get_ambient_display_history(uid: str) -> str:
        """Fetches ambient display history for LLM context"""
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        ambient_display_collection = user_doc_ref.collection("ambient-display")
        
        docs = [doc async for doc in ambient_display_collection.order_by("createdAt").stream()]
        
        if not docs:
            return "No garden history yet."
        
        lines = ["# Garden History"]
        
        for doc in docs:
            data = doc.to_dict()
            timestamp = data.get("createdAt", "Unknown")
            week_idx = data.get("weekIndex", 0)
            progress = data.get("progress", 0.0)
            diff_string = data.get("diff", "No changes recorded.")
            
            lines.append(f"## Week {week_idx} - Progress: {progress*100:.1f}%")
            lines.append(f"Date: {timestamp}")
            lines.append(diff_string)
            lines.append("")
        
        return "\n".join(lines)
