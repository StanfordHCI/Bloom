import logging
import os
import random
from typing import Any
from backend.managers.firebase_manager import FirebaseManager
from PIL import Image

from backend.utils.date_utils import parse_iso_to_timestamp

logger = logging.getLogger(__name__)
firebase_manager = FirebaseManager()

def draw_ambient_display(
    base_image_path: str,
    plan_doc: dict[str, Any],
    width: int,
    height: int
) -> tuple[Image.Image, list[dict[str, Any]]]:
    logger.info("Rendering ambient display")
    logger.info(f"Base image path: {base_image_path}")
    logger.info(f"Base image exists: {os.path.isfile(base_image_path)}")
    with Image.open(base_image_path).convert("RGBA") as bg_img:
        img_w, img_h = bg_img.size
        assert img_w == 1320 and img_h == 2868, "Base image must be 1320x2868"

        plan_workouts = []
        day_order = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
        for d in day_order:
            daily = plan_doc.get("workoutsByDay", {}).get(d, [])
            plan_workouts.extend(daily)
        plan_workouts.sort(key=lambda w: parse_iso_to_timestamp(w["timeStart"]))

        total_plan_count = sum(1 for w in plan_workouts if w.get("isPlanWorkout"))
        overlay_img = Image.new("RGBA", bg_img.size, (0,0,0,0))
        placed_bboxes: list[list[int]] = []
        plan_count_so_far = 0

        col_width = 1320 // 5
        y_max = 1557
        y_min = 1146

        critters = []

        for workout in plan_workouts:
            if not workout.get("completed"):
                continue

            if total_plan_count > 0 and workout.get("isPlanWorkout"):
                current_progress = plan_count_so_far / total_plan_count
            else:
                current_progress = plan_count_so_far / (total_plan_count or 1)

            col_index = int(current_progress * 5)
            if col_index > 4:
                col_index = 4

            if workout.get("id"):
                random.seed(workout.get("id"))
            else:
                logger.warning(f"Workout {workout} has no ID, using random UUID.")

            critter = load_critter_image(workout)

            logger.debug(f"Drawing critter in column {col_index} for workout {workout['id']} {workout['type']}")

            angle = random.randint(-30, 30)
            critter_rot = critter.rotate(angle, expand=True)
            cw, ch = critter_rot.size

            x_min = col_index * col_width
            x_max = x_min + col_width

            placed = False
            for _ in range(10):
                rand_x = random.randint(x_min, max(x_min, x_max - cw))
                rand_y = random.randint(y_min, max(y_min, y_max - ch))
                new_bbox = [rand_x, rand_y, rand_x + cw, rand_y + ch]

                if not any(bboxes_intersect(pb, new_bbox) for pb in placed_bboxes):
                    overlay_img.alpha_composite(critter_rot, (rand_x, rand_y))
                    placed_bboxes.append(new_bbox)
                    placed = True
                    break
            
            if not placed:
                rand_x = random.randint(x_min, max(x_min, x_max - cw))
                rand_y = random.randint(y_min, max(y_min, y_max - ch))
                new_bbox = [rand_x, rand_y, rand_x + cw, rand_y + ch]
                overlay_img.alpha_composite(critter_rot, (rand_x, rand_y))
                placed_bboxes.append(new_bbox)

            critters.append({
                "id": workout["id"],
                "type": workout.get("type", "Unknown"),
                "durationMin": float(workout.get("durationMin", 0)),
                "day": workout.get("day", "Unknown"),
                "timeStart": workout.get("timeStart", "Unknown")
            })

            if workout.get("isPlanWorkout"):
                plan_count_so_far += 1

        combined = Image.alpha_composite(bg_img, overlay_img)

    if width > 0 and height > 0:
        combined = combined.resize((width, height), Image.Resampling.LANCZOS)

    return combined.convert("RGB"), critters

def get_workout_category_and_size(workout_type: str, workout_duration: float) -> str:
    workout_type = workout_type.lower().strip()

    # Decide on size
    if workout_duration >= 30:
        size = "big"
    elif workout_duration >= 15:
        size = "med"
    else:
        size = "small"

    # Category logic
    cardio = {
        "running","wheelchair walk pace","wheelchair run pace","elliptical",
        "stairs","stair climbing","step training","cross training",
        "mixed metabolic cardio training","mixed cardio",
        "high intensity interval training","cycling","hand cycling","jump rope"
    }
    strength = {
        "functional strength training","traditional strength training","core training",
        "barre","gymnastics","flexibility","preparation and recovery"
    }
    mind_body = {
        "yoga","pilates","tai chi","mind and body","dance","dance inspired training",
        "cardio dance","social dance"
    }
    team_combat = {
        "american football","australian football","baseball","basketball",
        "bowling","boxing","cricket","curling","fencing","golf","handball","hockey",
        "lacrosse","martial arts","racquetball","rugby","soccer","softball","squash",
        "table tennis","tennis","track and field","volleyball","disc sports","badminton",
        "wrestling","kickboxing","pickleball"
    }
    outdoor = {
        "archery","climbing","equestrian sports","fishing","hunting","paddle sports",
        "rowing","sailing","skating sports","hiking","snow sports","downhill skiing",
        "cross country skiing","snowboarding","surfing sports","swimming","water sports",
        "water fitness","water polo"
    }

    # Special case: walking => "walk-xyz.png"
    if workout_type == "walking":
        prefix = "walk"
    elif workout_type in cardio:
        prefix = "cardio-aerobic"
    elif workout_type in strength:
        prefix = "strength-conditioning"
    elif workout_type in mind_body:
        prefix = "mind-body-dance"
    elif workout_type in team_combat:
        prefix = "team-combat"
    elif workout_type in outdoor:
        prefix = "outdoor-rec"
    else:
        # fallback
        prefix = "misc-recovery"

    return f"{prefix}-{size}.png"

def load_critter_image(workout: dict) -> Image.Image:
    """
    Returns a PIL Image with RGBA loaded from backend/assets/critters/
    based on workout type & duration.
    """
    workout_type = workout.get("type", "")
    dur = float(workout.get("durationMin", 0))
    fname = get_workout_category_and_size(workout_type, dur)

    critter_path = os.path.join("backend", "assets", "critters", fname)
    if not os.path.isfile(critter_path):
        # fallback or error
        logger.warning(f"No critter asset found at {critter_path}, using misc-recovery.")
        critter_path = os.path.join("backend","assets","critters","misc-recovery-small.png")
    
    return Image.open(critter_path).convert("RGBA")

def bboxes_intersect(b1, b2):
    """Check if two bounding boxes [x1, y1, x2, y2] overlap."""
    return not (b2[0] > b1[2] or b2[2] < b1[0] or b2[1] > b1[3] or b2[3] < b1[1])

def generate_ambient_display_diff_string(
    old_ambient_display_dict: dict,
    new_progress: float,
    new_week_idx: int,
    new_critters: list[dict]
) -> str:
    """
    Generate a diff string combining a progress string (if the garden advanced) with a critter string describing new critters from workouts.
    """
    new_progress_pct = new_progress * 100
    old_progress_pct = old_ambient_display_dict.get("progress", 0) * 100
    old_week_idx = old_ambient_display_dict.get("weekIndex", 1)

    new_bucket = int(new_progress_pct // 20)
    old_bucket = int(old_progress_pct // 20)

    progress_strings = {
        1: [
            "Your garden is ready with fresh soil, waiting for new growth.",
            "Look at that - your first small sprout has emerged on the left side of the garden!",
            "Great progress! Your sprout has grown taller into a small sapling.",
            "You're doing great! Your sapling is now noticeably taller and has sprouted new leaves.",
            "Those leaves have transformed into purple buds that are almost ready to bloom - you're getting close!",
            "Success! The buds have fully bloomed into a beautiful iris. And look - a branch and bird have appeared in your garden!"
        ],
        2: [
            "Your purple flower, branch, and bird continue to thrive in your garden.",
            "A new addition! Your second small sprout has appeared on the right side of the garden.",
            "Nice work! This second sprout has grown taller into a small sapling.",
            "Keep it up! Your second sapling is now tall and has sprouted fresh new leaves.",
            "Those leaves have now transformed into pink buds almost ready to bloom - another flower is coming!",
            "Beautiful! The pink buds have fully bloomed into a lotus flower. Look what's new - a second branch with a beehive has appeared! Your garden now showcases two distinct flowers and two branches with different features."
        ],
        3: [
            "Your garden maintains its purple and pink flowers, and you have two branches with a beehive and a bird!",
            "More growth happening! The third and fourth small sprouts have appeared closer to the center of your garden.",
            "Good progress! These new sprouts have grown taller into small saplings.",
            "You're on a roll! Both saplings are now tall and have sprouted additional leaves.",
            "Exciting development! The leaves have transformed into yellow and blue buds that are almost ready to bloom.",
            "Wonderful achievement! The buds have fully bloomed - you now have a yellow sunflower and a blue flower. Notice the new birdhouse that has appeared on the branch with the bird! Your garden now displays four colorful flowers and enriched branches."
        ],
        4: [
            "Your diverse garden is thriving with four beautiful flowers - purple, yellow, blue, and pink - along with the branches featuring the beehive and birds.",
            "The final phase begins! Your fifth and final sprout has appeared right at the center of the garden - this one will be the biggest flower yet!",
            "Good work! This center sprout has grown into a promising sapling.",
            "Impressive growth! This center sapling is now considerably taller than the others and has sprouted abundant leaves.",
            "Almost there! Those leaves have transformed into red buds that are nearly ready for their grand reveal.",
            "Congratulations! The red buds have fully bloomed into a tall, striking flower standing proudly at the center of your garden. Your garden has fully bloomed with five beautiful flowers creating a complete, thriving display!"
        ]
    }

    progress_string = ""
    if new_week_idx > old_week_idx or new_bucket > old_bucket:
        logger.info(f"Fetching progress string for: new_week_idx={new_week_idx}, old_week_idx={old_week_idx}, new_bucket={new_bucket}, old_bucket={old_bucket}")
        # progress_string = progress_strings[new_week_idx][new_bucket]
        week_strings = progress_strings.get(new_week_idx, [])
        if not week_strings:
            raise ValueError(f"No progress strings found for week index {new_week_idx}, using default.")
        if new_bucket >= len(week_strings) or new_bucket < 0:
            raise ValueError(f"Invalid progress bucket {new_bucket} for week index {new_week_idx}, using default.")
        
        progress_string = week_strings[new_bucket]
        
    added_critters, removed_critters = get_workouts_diff(old_ambient_display_dict.get("critters", []), new_critters)

    critter_counts: dict[str, int] = {}
    for critter in added_critters:
        filename = get_workout_category_and_size(critter.get("type", ""), float(critter.get("durationMin", 0)))
        category = "-".join(filename.split("-")[:-1])
        critter_counts[category] = critter_counts.get(category, 0) + 1

    critter_templates = {
        "cardio-aerobic": ("red", "butterfly"),
        "strength-conditioning": ("orange", "butterfly"),
        "team-combat": ("green", "butterfly"),
        "mind-body-dance": ("yellow", "butterfly"),
        "misc-recovery": ("purple", "butterfly"),
        "outdoor-rec": ("blue", "butterfly"),
        "walk": ("yellow", "bee")
    }

    critter_texts = []
    for category, count in critter_counts.items():
        if category not in critter_templates:
            continue
        color, critter_type = critter_templates[category]
        if count == 1:
            critter_texts.append(f"a {color} {critter_type}")
        else:
            plural = "butterflies" if critter_type == "butterfly" else "bees"
            critter_texts.append(f"{count} {color} {plural}")

    critter_string = ""
    if critter_texts:
        if len(critter_texts) == 1:
            critter_string = f"You've gained {critter_texts[0]} from your recent workout!"
        else:
            critter_list = ", ".join(critter_texts[:-1]) + " and " + critter_texts[-1]
            critter_string = f"You've gained {critter_list} from your recent workouts!"

    # Combine the two parts (if both exist, join them with a space; otherwise use the one provided)
    diff_string = ""
    if progress_string and critter_string:
        diff_string = f"{progress_string} {critter_string}"
    elif progress_string:
        diff_string = progress_string
    elif critter_string:
        diff_string = critter_string

    return diff_string

def get_workouts_diff(
    old_critters: list[dict], 
    new_critters: list[dict]
) -> tuple[list[dict], list[dict]]:
    
    old_map = {c["id"]: c for c in old_critters}
    new_map = {c["id"]: c for c in new_critters}

    added = []
    removed = []

    old_ids = set(old_map.keys())
    new_ids = set(new_map.keys())

    added_ids = new_ids - old_ids
    removed_ids = old_ids - new_ids

    for wid in added_ids:
        added.append(new_map[wid])
    
    for wid in removed_ids:
        removed.append(old_map[wid])

    return added, removed