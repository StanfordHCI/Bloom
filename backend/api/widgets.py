import os
import io
import logging
import traceback
import uuid
from datetime import datetime
from dateutil import parser
import numpy as np
import pytz

from fastapi import APIRouter, HTTPException, Header

from backend.api.auth import verify_token
from backend.api.models import WidgetUpdateRequest, WidgetUpdateResponse, NextWorkoutModel
from backend.managers.firebase_manager import FirebaseManager
from backend.utils.date_utils import get_current_iso_datetime_str
from backend.utils.plan_utils import (
    get_all_user_plans_sorted,
    get_plan_history,
    compute_plan_progress,
    compute_plan_hash,
    auto_link_workouts,
    sanitize_plan_history,
    update_plan_doc,
    get_next_workout
)
from backend.utils.ambient_display_utils import draw_ambient_display, generate_ambient_display_diff_string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/widget")
firebase_manager = FirebaseManager()


# Helper function to get the last active display for a user (used as a fallback)
async def get_last_active_display_for_user(uid: str) -> WidgetUpdateResponse:
    user_doc_ref = firebase_manager.get_user_doc_ref(uid)
    ambient_disp_ref = user_doc_ref.collection("ambient-display")
    query = ambient_disp_ref.where("isActive", "==", True).limit(1)
    query_results = [doc async for doc in query.stream()]

    if not query_results:
        logger.error(f"No active ambient display found for user {uid}. Sending empty fallback response.")
        return WidgetUpdateResponse(
            progress=0.0,
            nextWorkout=NextWorkoutModel(dayName="", timeString="", type="", durationMin=0),
            imageURL=""
        )

    existing_doc = query_results[0].to_dict()
    return WidgetUpdateResponse(
        progress=existing_doc.get("progress", 0.0),
        nextWorkout=NextWorkoutModel(**existing_doc.get("nextWorkout", {})),
        imageURL=existing_doc.get("url", "")
    )


@router.post("/update", response_model=WidgetUpdateResponse)
async def widget_update(
    request: WidgetUpdateRequest,
    authorization: str = Header(None),
):
    logger.info(f"Ambient display update request received: width={request.width}, height={request.height}")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=400, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    uid = await verify_token(token)

    try:
        logger.info(f"Received {len(request.workouts)} HealthKit workouts for user {uid}: {request.workouts}")

        plans = await get_all_user_plans_sorted(uid)
        plans = await sanitize_plan_history(uid, plans)
        logger.info(f"Found {len(plans)} total plans for user {uid}")
        active_plans = [p for p in plans if p.get("isActive", False)]
        logger.info(f"Found {len(active_plans)} active plans for user {uid}")

        if not active_plans:
            logger.error(f"No active plan found for user {uid}.")
            return await get_last_active_display_for_user(uid)

        current_week_idx, current_plan, num_incomplete_weeks, upcoming_plan = get_plan_history(uid, active_plans)
        logger.info(f"Current week index: {current_week_idx}, num incomplete weeks: {num_incomplete_weeks}")
        logger.info(f"Current plan: {current_plan}, upcoming plan: {upcoming_plan}")

        active_plan_dict = current_plan if current_plan else upcoming_plan
        if not active_plan_dict:
            logger.error("No active plan found for user {uid} the current week.")
            return await get_last_active_display_for_user(uid)

        changed = False
        if current_plan:
            changed, active_plan_dict = auto_link_workouts(uid, current_plan, request.workouts)

        if changed and current_plan:
            await update_plan_doc(uid, current_plan.get("doc_id", ""), active_plan_dict)

        plan_progress = compute_plan_progress(active_plan_dict)
        next_workout_data = await get_next_workout(uid, active_plan_dict)
        if not next_workout_data:
            logger.warning(f"No next workout found for user {uid} in the current week. Sending empty response.")
            next_workout_data = {
                "dayName": "",
                "timeString": "",
                "type": "",
                "durationMin": 0
            }

        next_workout = NextWorkoutModel(**next_workout_data)

        plan_hash = compute_plan_hash(active_plans)
        logger.info(f"Computed plan hash: {plan_hash}")

        # Short-circuit if we already have a matching doc
        user_doc_ref = firebase_manager.get_user_doc_ref(uid)
        ambient_disp_ref = user_doc_ref.collection("ambient-display")
        query = ambient_disp_ref.where("hash", "==", plan_hash).limit(1)
        query_results = [doc async for doc in query.stream()]
        if query_results:
            existing_doc = query_results[0].to_dict()
            doc_id = query_results[0].id
            if not existing_doc.get("isActive", False):
                logger.warning(f"Found existing doc {doc_id} that matches plan hash but it is not active")
            logger.info(f"Short-circuit returning existing doc: {doc_id}")
            return WidgetUpdateResponse(
                progress=plan_progress,
                nextWorkout=next_workout,
                imageURL=existing_doc.get("url", "")
            )

        if current_week_idx < 0:
            display_index = 1
            display_progress = 0
        else:
            display_index = current_week_idx + 1 - num_incomplete_weeks
            display_progress = int(20 * np.floor(5 * plan_progress))

        if display_index < 1:
            logger.error(f"Invalid display_index {display_index} found for user {uid} (current_week_idx={current_week_idx}, num_incomplete_weeks={num_incomplete_weeks}). Defaulting to 1.")
            display_index = 1
        if display_index > 4:
            logger.warning(f"Display index {display_index} exceeds maximum of 4 for user {uid}. Defaulting to 4.")
            display_index = 4
            display_progress = 100

        base_filename = f"{display_index}_{display_progress}.png"
        base_filepath = os.path.join("backend", "assets", "ambient_display", base_filename)
        if not os.path.isfile(base_filepath):
            logger.error(
                f"Base image not found for index={display_index}, progress={display_progress}. Defaulting to fallback."
            )
            return await get_last_active_display_for_user(uid)

        new_image, new_critters = draw_ambient_display(
            base_image_path=base_filepath,
            plan_doc=active_plan_dict,
            width=request.width,
            height=request.height
        )
        logger.info(f"Successfully drew ambient display with {len(new_critters)} critters")

        buf = io.BytesIO()
        new_image.save(buf, format="JPEG", quality=85, subsampling=0)
        buf.seek(0)
        final_img_bytes = buf.read()
        image_key = str(uuid.uuid4())

        try:
            gcs_url = firebase_manager.upload_ambient_display_image(uid, image_key, final_img_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

        active_ambient_display_query = ambient_disp_ref.where("isActive", "==", True)
        active_ambient_display_refs = [doc async for doc in active_ambient_display_query.stream()]
        old_ambient_display_dict = None
        for old_doc in active_ambient_display_refs:
            try:
                await ambient_disp_ref.document(old_doc.id).update({"isActive": False})
            except Exception:
                pass
            if not old_ambient_display_dict:
                old_ambient_display_dict = old_doc.to_dict()
                old_ambient_display_dict["doc_id"] = old_doc.id

        if not old_ambient_display_dict:
            old_ambient_display_dict = {"weekIndex": display_index, "progress": 0.0, "critters": []}

        new_completed_workout_count = count_completed_workouts(active_plan_dict)
        logger.info(f"New completed workouts count: {new_completed_workout_count}")

        previous_plan = None
        if current_plan:
            group = [p for p in plans if p.get("start") == current_plan.get("start")]
            sorted_plans = sorted(group, key=lambda x: parse_date_str(x.get("createdAt", "")))
            try:
                curr_index = sorted_plans.index(active_plan_dict)
                if curr_index > 0:
                    previous_plan = sorted_plans[curr_index - 1]
            except ValueError:
                pass

        if previous_plan:
            old_completed_workout_count = count_completed_workouts(previous_plan)
        else:
            old_completed_workout_count = 0

        logger.info(f"Old completed workouts count: {old_completed_workout_count}")

        new_bucket = int(plan_progress * 100 // 20)
        old_bucket = int(old_ambient_display_dict.get("progress", 0) * 100 // 20)

        garden_grew = ((new_bucket > old_bucket) or (display_index > old_ambient_display_dict.get("weekIndex", 1))) \
            and (new_completed_workout_count > old_completed_workout_count)
        logger.info(f"Garden grew: {garden_grew}, new_bucket: {new_bucket}, old_bucket: {old_bucket}")

        diff_msg = generate_ambient_display_diff_string(old_ambient_display_dict, plan_progress, display_index, new_critters)

        now = get_current_iso_datetime_str()
        doc_id = f"ambient-display-{now}"
        doc_data = {
            "isActive": True,
            "hash": plan_hash,
            "progress": plan_progress,
            "nextWorkout": next_workout_data,
            "url": gcs_url,
            "weekIndex": display_index,
            "planDocId": active_plan_dict.get("doc_id", ""),
            "diff": diff_msg,
            "createdAt": now,
            "critters": new_critters,
            "gardenGrew": garden_grew,
            "modalShown": False,
        }

        await ambient_disp_ref.document(doc_id).set(doc_data)
        logger.info(f"Created new ambient-display doc {doc_id} for {uid} with URL: {gcs_url}")

        return WidgetUpdateResponse(
            progress=plan_progress,
            nextWorkout=next_workout,
            imageURL=gcs_url
        )

    except Exception as e:
        traceback.print_exc()
        logger.error(f"Unexpected error while generating/updating widget for user {uid}: {e}. Sending fallback response.")
        return await get_last_active_display_for_user(uid)


def count_completed_workouts(plan: dict) -> int:
    count = 0
    workouts_by_day = plan.get("workoutsByDay", {})
    for day, workouts in workouts_by_day.items():
        count += sum(1 for workout in workouts if workout.get("completed", False))
    return count


def parse_date_str(date_str: str) -> datetime:
    dt = parser.parse(date_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=pytz.UTC)
    else:
        dt = dt.astimezone(pytz.UTC)
    return dt
