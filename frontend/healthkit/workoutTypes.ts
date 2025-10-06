export const WorkoutTypes = [
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
] as const;

export type WorkoutType = (typeof WorkoutTypes)[number];

const workoutTypeSymbols: Record<WorkoutType, string> = {
  "walking": "figure.walk",
  "running": "figure.run",
  "american football": "figure.american.football",
  "archery": "figure.archery",
  "australian football": "figure.australian.football",
  "badminton": "figure.badminton",
  "baseball": "figure.baseball",
  "basketball": "figure.basketball",
  "bowling": "figure.bowling",
  "boxing": "figure.boxing",
  "climbing": "figure.climbing",
  "cricket": "figure.cricket",
  "cross training": "figure.cross.training",
  "curling": "figure.curling",
  "cycling": "figure.outdoor.cycle",
  "dance": "figure.dance",
  "dance inspired training": "figure.socialdance",
  "elliptical": "figure.elliptical",
  "equestrian sports": "figure.equestrian.sports",
  "fencing": "figure.fencing",
  "fishing": "figure.fishing",
  "functional strength training": "figure.strengthtraining.functional",
  "golf": "figure.golf",
  "gymnastics": "figure.gymnastics",
  "handball": "figure.handball",
  "hiking": "figure.hiking",
  "hockey": "figure.hockey",
  "hunting": "figure.hunting",
  "lacrosse": "figure.lacrosse",
  "martial arts": "figure.martial.arts",
  "mind and body": "figure.mind.and.body",
  "mixed metabolic cardio training": "figure.mixed.cardio",
  "paddle sports": "figure.rolling",
  "play": "figure.play",
  "preparation and recovery": "figure.cooldown",
  "racquetball": "figure.racquetball",
  "rowing": "figure.indoor.rowing",
  "rugby": "figure.rugby",
  "sailing": "figure.sailing",
  "skating sports": "figure.skateboarding",
  "snow sports": "figure.skiing.crosscountry",
  "soccer": "figure.outdoor.soccer",
  "softball": "figure.softball",
  "squash": "figure.squash",
  "stair climbing": "figure.stairs",
  "surfing sports": "figure.surfing",
  "swimming": "figure.pool.swim",
  "table tennis": "figure.table.tennis",
  "tennis": "figure.tennis",
  "track and field": "figure.track.and.field",
  "traditional strength training": "figure.strengthtraining.traditional",
  "volleyball": "figure.volleyball",
  "water fitness": "figure.water.fitness",
  "water polo": "figure.waterpolo",
  "water sports": "figure.surfing",
  "wrestling": "figure.wrestling",
  "yoga": "figure.yoga",
  "barre": "figure.barre",
  "core training": "figure.core.training",
  "cross country skiing": "figure.skiing.crosscountry",
  "downhill skiing": "figure.skiing.downhill",
  "flexibility": "figure.flexibility",
  "high intensity interval training": "figure.highintensity.intervaltraining",
  "jump rope": "figure.jumprope",
  "kickboxing": "figure.kickboxing",
  "pilates": "figure.pilates",
  "snowboarding": "figure.snowboarding",
  "stairs": "figure.stairs",
  "step training": "figure.step.training",
  "wheelchair walk pace": "figure.roll.runningpace",
  "wheelchair run pace": "figure.roll.runningpace",
  "tai chi": "figure.taichi",
  "mixed cardio": "figure.mixed.cardio",
  "hand cycling": "figure.hand.cycling",
  "disc sports": "figure.disc.sports",
  "fitness gaming": "figure.mind.and.body",
  "cardio dance": "figure.dance",
  "social dance": "figure.socialdance",
  "pickleball": "figure.pickleball",
  "cooldown": "figure.cooldown",
  "swim bike run": "figure.mixed.cardio",
  "transition": "figure.cooldown"
};

export const workoutTypeToSFSymbol = (workoutType: string): string => {
  if (typeof workoutType !== "string") {
    console.error("Non-string workout type found:", workoutType);
    return "figure.mixed.cardio";
  }

  return workoutTypeSymbols[workoutType.toLowerCase() as WorkoutType] ?? "figure.mixed.cardio";
};

export const shortenWorkoutType = (type: string): string => {
  if (typeof type !== "string") {
    console.error("Non-string workout type found:", type);
    return "Unknown";
  }

  let shortened = type.toLowerCase();
  switch (shortened) {
    case "functional strength training":
    case "traditional strength training":
      shortened = "strength training";
      break;
    case "high intensity interval training":
      shortened = "HIIT";
      break;
    case "mixed metabolic cardio training":
      shortened = "mixed cardio";
      break;
    case "dance inspired training":
      shortened = "dance";
      break;
    case "preparation and recovery":
      shortened = "recovery";
      break;
    case "wheelchair walk pace":
      shortened = "wheelchair walk";
      break;
    case "wheelchair run pace":
      shortened = "wheelchair run";
      break;
    default:
      break;
  }
  return shortened.charAt(0).toUpperCase() + shortened.slice(1);
};