from copy import deepcopy
from datetime import datetime, time, timedelta
from dateutil import parser
import hashlib
import json
import logging
from typing import Any, Optional

import pytz
from backend.api.models import HKWorkoutData
from backend.managers.firebase_manager import FirebaseManager
from backend.utils.date_utils import (
    get_current_iso_datetime_str,
    localize_datetime,
    parse_iso_to_timestamp,
)

logger = logging.getLogger(__name__)
firebase_manager = FirebaseManager()


async def get_all_user_plans_sorted(uid: str) -> list[dict[str, Any]]:
    """
    Return all plan docs sorted by their start date ascending.
    Each doc must have doc_id, start, end, isActive, etc.
    """
    plan_ids = await firebase_manager.get_user_workout_plan_ids(uid)
    if not plan_ids:
        return []
    user_plans_ref = firebase_manager.get_user_doc_ref(uid).collection("plans")

    docs = []
    for pid in plan_ids:
        snap = await user_plans_ref.document(pid).get()
        if snap.exists:
            d = snap.to_dict() or {}
            d["doc_id"] = pid
            docs.append(d)

    docs.sort(key=lambda x: parse_iso_to_timestamp(x.get("start", "")))
    return docs

async def sanitize_plan_history(uid: str, plan_docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Sanitize up a user's plan history so that for each Sun->Sat period, keep at most one *active* plan doc:
    """
    today = datetime.now().date()
    sanitized: list[dict[str, Any]] = []

    valid_plans = []
    for plan in plan_docs:
        doc_id = plan.get("doc_id")
        start_str = plan.get("start", "")
        end_str = plan.get("end", "")
        if not doc_id or not start_str or not end_str:
            logger.warning(f"[sanitize_plan_history] Missing doc_id/start/end for plan {doc_id} for user {uid}; skipping.")
            continue

        try:
            start_date = parser.parse(start_str).date()
            end_date = parser.parse(end_str).date()
        except Exception as e:
            logger.warning(f"[sanitize_plan_history] Failed to parse start/end for plan {doc_id} for user {uid}: {e}; skipping.")
            continue

        if start_date.weekday() != 6:
            logger.warning(f"[sanitize_plan_history] Plan {doc_id} for user {uid} start={start_date} is not a Sunday; skipping.")
            continue
        if end_date.weekday() != 5:
            logger.warning(f"[sanitize_plan_history] Plan {doc_id} for user {uid} end={end_date} is not a Saturday; skipping.")
            continue
        if start_date > (today + timedelta(days=7)):
            logger.warning(f"[sanitize_plan_history] Plan {doc_id} for user {uid} start={start_date} is more than 1 week in the future; skipping.")
            continue

        valid_plans.append(plan)

    plans_by_sunday: dict[str, list[dict]] = {}
    for p in valid_plans:
        sunday_str = p["start"]
        plans_by_sunday.setdefault(sunday_str, []).append(p)

    def parse_date_str(date_str: str) -> datetime:
        dt = parser.parse(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)
        else:
            dt = dt.astimezone(pytz.UTC)
        return dt

    for sunday_str, group in plans_by_sunday.items():
        active_docs = [g for g in group if g.get("isActive", False)]
        logger.info(f"[sanitize_plan_history] Processing plans for week starting {sunday_str} for user {uid}: found {len(group)} total, {len(active_docs)} active.")

        if len(active_docs) == 0: # No active plans found for this week
            most_recent_active = sorted(
                group, 
                key=lambda x: parse_date_str(x.get("createdAt", "")),
                reverse=True
            )[0]
            doc_id = most_recent_active["doc_id"]
            try:
                await firebase_manager.get_user_doc_ref(uid).collection("plans").document(doc_id).update({"isActive": True})
                most_recent_active["isActive"] = True
                logger.info(f"[sanitize_plan_history] Marked plan={doc_id} for user {uid} as active for week starting {sunday_str} (no active plans found).")
            except Exception as e:
                logger.warning(f"[sanitize_plan_history] Failed to update doc {doc_id} for user {uid} to active: {e}")
                continue
        
        elif len(active_docs) > 1: # More than one active plan found
            most_recent_active = sorted(
                active_docs, 
                key=lambda x: parse_date_str(x.get("createdAt", "")),
                reverse=True
            )[0]
            
            for doc in active_docs:
                if doc is not most_recent_active and doc.get("isActive", False):
                    try:
                        await firebase_manager.get_user_doc_ref(uid).collection("plans").document(doc["doc_id"]).update({"isActive": False})
                        doc["isActive"] = False
                        logger.info(f"[sanitize_plan_history] Multiple active plans found for user {uid} for week starting {sunday_str}; marking doc={doc['doc_id']} as inactive.")
                    except Exception as e:
                        logger.warning(f"[sanitize_plan_history] Failed to update doc {doc['doc_id']} to inactive: {e}")

        sanitized.extend(group)
    
    return sanitized

def get_plan_history(
    uid: str, sorted_active_plans: list[dict]
) -> tuple[int, dict | None, int, dict | None]:
    user_tz_str = firebase_manager.get_sync_user_timezone(uid)
    user_tz = pytz.timezone(user_tz_str)
    now = datetime.now(user_tz).replace(tzinfo=None)

    current_week_idx = -1
    current_plan = None
    incomplete_count = 0
    upcoming_plan = None

    last_week_index = -1
    last_plan = None
    last_end_dt = None

    for i, plan in enumerate(sorted_active_plans):
        start_str = plan.get("start")
        end_str = plan.get("end")
        if not start_str or not end_str:
            logger.error(f"Missing 'start' or 'end' in plan: {plan}")
            continue

        try:
            start_date = parser.parse(start_str, ignoretz=True).date()
            end_date = parser.parse(end_str, ignoretz=True).date()
        except Exception as e:
            logger.error(f"Failed to parse plan: {plan} -> {e}")
            continue

        start_dt = datetime.combine(start_date, time(0, 0, 0))
        end_dt = datetime.combine(end_date, time(23, 59, 59))

        if start_dt <= now <= end_dt:
            current_week_idx = i
            current_plan = plan
        else:
            # past plan: compute progress & keep track of the last one
            if end_dt < now:
                if compute_plan_progress(plan) < 1.0:
                    incomplete_count += 1
                if last_end_dt is None or end_dt > last_end_dt:
                    last_week_index = i
                    last_plan = plan
                    last_end_dt = end_dt
            # future plan: record the first one as upcoming.
            elif start_dt > now and upcoming_plan is None:
                upcoming_plan = plan

    # no plan covers the current week
    if current_plan is None:
        if last_plan is not None:
            current_week_idx = last_week_index + 1
        else:
            current_week_idx = -1

    return current_week_idx, current_plan, incomplete_count, upcoming_plan


def compute_plan_progress(plan: dict[str, Any]) -> float:
    wbd = plan.get("workoutsByDay", {})

    total = 0
    comp = 0

    for daily in wbd.values():
        for w in daily:
            if w.get("isPlanWorkout"):
                total += 1
                if w.get("completed"):
                    comp += 1

    if total == 0:
        return 0.0

    return comp / total

def deduplicate_workouts(hk_workouts: list[dict]) -> list[dict]:
    """
    Group fetched HealthKit workouts into duplicates if they overlap in time,
    have the same workout type (ignoring case), and their durations differ by no more than 20%.
    Then, for each group, create a new Workout that consolidates the duplicates.
    """
    groups: list[list[dict[str, Any]]] = []
    for workout in hk_workouts:
        w_start = parse_iso_to_timestamp(workout["timeStart"])
        w_duration = workout["durationMin"]
        w_end = w_start + (w_duration * 60)

        found_group = None
        for group in groups:
            rep = group[0]
            rep_start = parse_iso_to_timestamp(rep["timeStart"])
            rep_duration = rep["durationMin"]
            rep_end = rep_start + (rep_duration * 60)
            if w_end > rep_start and rep_end > w_start:
                if workout["workoutType"].lower() == rep["workoutType"].lower():
                    if abs(w_duration - rep_duration) <= 0.2 * max(w_duration, rep_duration):
                        found_group = group
                        break
        if found_group is not None:
            found_group.append(workout)
        else:
            groups.append([workout])

    deduped = []
    for group in groups:
        if len(group) > 1:
            longest = max(group, key=lambda w: w["durationMin"])
            new_workout = {
                "id": longest["id"],
                "durationMin": longest["durationMin"],
                "timeStart": longest["timeStart"],
                "type": longest["workoutType"],
                "intensity": longest.get("intensity", "moderate"), 
                "completed": True,
                "isPlanWorkout": True,
                "isHKWorkout": True,
                "healthKitWorkoutData": group,
            }
            deduped.append(new_workout)
        else:
            single = group[0]
            new_workout = {
                "id": single["id"],
                "durationMin": single["durationMin"],
                "timeStart": single["timeStart"],
                "type": single["workoutType"],
                "intensity": single.get("intensity", "moderate"),
                "completed": True,
                "isPlanWorkout": True,
                "isHKWorkout": True,
                "healthKitWorkoutData": [single],
            }
            deduped.append(new_workout)
    return deduped

def auto_link_workouts(
    uid: str,
    current_plan: dict[str, Any], 
    fetched_workouts: list[HKWorkoutData],
) -> tuple[bool, dict[str, Any]]:
    changed = False

    day_order = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ]
    plan_workouts = []
    for d in day_order:
        daily_workouts = current_plan.get("workoutsByDay", {}).get(d, [])
        for w in daily_workouts:
            w["day"] = d
            plan_workouts.append(w)

    def hk_workout_key(hk: dict[str, Any]) -> tuple[str, float, str]:
        # If it's a deduplicated workout, we have "type"
        # If it's a raw HK workout, we have "workoutType"
        wtype = hk.get("type", hk.get("workoutType", "unknown")).lower()
        return (hk["timeStart"], hk["durationMin"], wtype)

    already_linked: list[tuple[str, float, str]] = []
    for w in plan_workouts:
        hk_arr = w.get("healthKitWorkoutData")
        if isinstance(hk_arr, list):
            for hk in hk_arr:
                already_linked.append(hk_workout_key(hk))

    user_tz_str = firebase_manager.get_sync_user_timezone(uid)

    hk_workouts_raw = sorted(
        [w.model_dump() for w in fetched_workouts],
        key=lambda x: parse_iso_to_timestamp(x["timeStart"]),
    )

    hk_workouts = deduplicate_workouts(hk_workouts_raw)

    new_plan = deepcopy(current_plan)
    new_plan["workoutsByDay"] = {d: [] for d in day_order}

    def overlap(workout_start, workout_end, hk_start, hk_end) -> bool:
        return (workout_end > hk_start) and (hk_end > workout_start)

    for workout in plan_workouts:
        day = workout["day"]
        if workout.get("healthKitWorkoutData", None) == []:
            new_plan["workoutsByDay"][day].append(workout)
            continue

        matched = []
        workout_type = workout["type"].lower()
        workout_start = parse_iso_to_timestamp(workout["timeStart"])
        workout_end = workout_start + (workout.get("durationMin", 0) * 60)

        not_matched = []
        for hk in hk_workouts:
            if hk_workout_key(hk) in already_linked or workout.get("healthKitWorkoutData", None):
                not_matched.append(hk)
                continue

            if workout_type != hk["type"].lower():
                not_matched.append(hk)
                continue

            hk_start = parse_iso_to_timestamp(hk["timeStart"])
            hk_end = hk_start + (hk["durationMin"] * 60)
            if overlap(workout_start, workout_end, hk_start, hk_end) and len(workout.get("healthKitWorkoutData", [])) == 0:
                matched += hk["healthKitWorkoutData"]
            else:
                not_matched.append(hk)

        if matched:
            workout["completed"] = True
            workout["healthKitWorkoutData"] = matched
            changed = True
            logger.info(f"Linked HKWorkout {matched} to plan workout {workout} on day {day} for user {uid}")

        hk_workouts = not_matched
        new_plan["workoutsByDay"][day].append(workout)

    for hk in hk_workouts:
        if hk_workout_key(hk) in already_linked:
            continue

        dt = datetime.fromisoformat(hk["timeStart"])
        localized_dt = localize_datetime(dt, user_tz_str)
        day_str = localized_dt.strftime("%A")
        new_plan["workoutsByDay"][day_str].append(hk)
        changed = True
        logger.info(f"Added unlinked HKWorkout {hk} to plan on day {day_str} for user {uid}")

    return changed, new_plan

async def update_plan_doc(uid: str, old_plan_id: str, new_plan: dict[str, Any]):
    user_plans_ref = firebase_manager.get_user_doc_ref(uid).collection("plans")
    try:
        await user_plans_ref.document(old_plan_id).update({"isActive": False})
    except Exception as e:
        logger.warning(f"Failed to inactivate old plan {old_plan_id}: {e}")

    now = get_current_iso_datetime_str()
    doc_id = f"plan-{now}"
    new_plan["doc_id"] = doc_id
    new_plan["isActive"] = True
    new_plan["revision"] = "Auto-linked HealthKit workouts"
    new_plan["createdAt"] = now

    await user_plans_ref.document(doc_id).set(new_plan)
    logger.info(f"Inactivated old plan={old_plan_id}, created new plan={doc_id}")


async def get_next_workout(
    uid: str, plan_doc: dict[str, Any]
) -> Optional[dict[str, Any]]:
    day_order = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ]
    user_tz_str = await firebase_manager.get_user_timezone(uid)
    user_tz = pytz.timezone(user_tz_str)
    now = datetime.now(user_tz)

    plan_start = datetime.fromisoformat(plan_doc["start"]).astimezone(user_tz)
    wbd = plan_doc.get("workoutsByDay", {})

    # If plan hasn't started yet, return the first uncompleted plan workout in ascending day order
    if plan_start > now:
        for d in day_order:
            unfinished = [
                w
                for w in wbd.get(d, [])
                if w.get("isPlanWorkout") and not w.get("completed")
            ]
            if unfinished:
                w = unfinished[0]
                ts = datetime.fromisoformat(w["timeStart"]).astimezone(user_tz)
                return {
                    "dayName": d[:3],
                    "timeString": ts.strftime("%I:%M %p"),
                    "type": w.get("type", ""),
                    "durationMin": int(w.get("durationMin", 0)),
                }
        return None

    # Else, proceed with day-based logic
    current_day = now.strftime("%A")
    current_day_index = day_order.index(current_day)
    while current_day_index < len(day_order):
        day_to_check = day_order[current_day_index]
        unfinished_plan_workouts = [
            w
            for w in wbd.get(day_to_check, [])
            if w.get("isPlanWorkout") and not w.get("completed")
        ]
        if unfinished_plan_workouts:

            def time_diff(w):
                return abs(
                    (
                        datetime.fromisoformat(w["timeStart"]).astimezone(user_tz) - now
                    ).total_seconds()
                )

            closest = min(unfinished_plan_workouts, key=time_diff)
            ts = datetime.fromisoformat(closest["timeStart"]).astimezone(user_tz)
            return {
                "dayName": day_to_check[:3],
                "timeString": ts.strftime("%I:%M %p"),
                "type": closest.get("type", ""),
                "durationMin": int(closest.get("durationMin", 0)),
            }
        current_day_index += 1

    return None


def compute_plan_hash(active_plan_history: list[dict[str, Any]]) -> str:
    # Example: dump the plan doc in sorted key order
    doc_str = json.dumps(active_plan_history, sort_keys=True, default=str)
    return hashlib.md5(doc_str.encode("utf-8")).hexdigest()
