import { Workout, WeeklyPlan, WeekdayName } from "./WeeklyPlan";
import { DateTime } from "luxon";

export function validateWorkout(workout: unknown): asserts workout is Workout {
  if (!workout || typeof workout !== "object") {
      throw new Error("Workout must be an object.");
  }
  const w = workout as Workout;

  if (typeof w.id !== "string") {
      throw new Error("Workout.id must be a string.");
  }
  if (typeof w.durationMin !== "number") {
      throw new Error(`Workout ${w.id} is missing durationMin as a number.`);
  }
  if (!["light", "moderate", "vigorous", undefined].includes(w.intensity)) {
      throw new Error(`Workout ${w.id} has invalid intensity: ${w.intensity}`);
  }
  if (typeof w.timeStart !== "string") {
      throw new Error(`Workout ${w.id} timeStart must be a string.`);
  }
  
  if (typeof w.completed !== "boolean") {
      throw new Error(`Workout ${w.id} completed must be a boolean.`);
  }
}

export function validateWeeklyPlanDoc(
  data: Partial<WeeklyPlan>,
  docId: string
): WeeklyPlan {
  if (!data.start || !data.end) {
    throw new Error(`Plan doc "${docId}" is missing start/end fields.`);
  }
  if (typeof data.start === "string") {
    const startDate = DateTime.fromISO(data.start);
    if (!startDate.isValid) {
      throw new Error(`Plan doc "${docId}" has an invalid start date format: ${data.start}`);
    }
  } else {
    throw new Error(`Plan doc "${docId}" start must be a string.`);
  }

  if (typeof data.end === "string") {
    const endDate = DateTime.fromISO(data.start);
    if (!endDate.isValid) {
      throw new Error(`Plan doc "${docId}" has an invalid end date format: ${data.end}`);
    }
  } else {
    throw new Error(`Plan doc "${docId}" end must be a string.`);;
  }

  // Check that start is Sunday, end is Saturday (per your requirement)
  const startDate = DateTime.fromISO(data.start).toJSDate();
  const endDate = DateTime.fromISO(data.end).toJSDate();
  if (startDate.getDay() !== 0) {
    throw new Error(`Plan doc "${docId}" start date must be Sunday.`);
  }
  if (endDate.getDay() !== 6) {
    throw new Error(`Plan doc "${docId}" end date must be Saturday.`);
  }

  if (!data.workoutsByDay) {
    throw new Error(`Plan doc "${docId}" is missing workoutsByDay.`);
  }

  for (const day of Object.keys(data.workoutsByDay) as WeekdayName[]) {
    const workouts = data.workoutsByDay[day] || [];
    workouts.forEach(validateWorkout);
  }

  // If createdAt is missing, default to now (optional)
  const createdAt =
    typeof data.createdAt === "string" && 
    DateTime.fromISO(data.createdAt).isValid
      ? data.createdAt
      : DateTime.utc().toISO();

  if (data.isActive === undefined) {
    throw new Error(`Plan doc "${docId}" isActive is missing.`);
  }

  return {
    id: docId,
    start: data.start,
    end: data.end,
    createdAt,
    isActive: data.isActive === true,
    workoutsByDay: data.workoutsByDay,
    revision: data.revision,
  };
}