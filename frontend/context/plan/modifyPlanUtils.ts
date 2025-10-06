import { DateTime } from "luxon";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { WeeklyPlan, WeekdayName, Workout } from "./WeeklyPlan.ts";
import { HKWorkout } from "../../healthkit/HealthKitModule.ts";

const dayNames: WeekdayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

function computeRevision(oldW: Workout, newW: Workout): string {
  const changes: string[] = [];
  if (oldW.durationMin !== newW.durationMin) {
    changes.push(`changed duration from ${oldW.durationMin} to ${newW.durationMin}`);
  }
  if (oldW.intensity !== newW.intensity) {
    changes.push(`changed intensity from ${oldW.intensity} to ${newW.intensity}`);
  }
  if (oldW.timeStart !== newW.timeStart) {
    changes.push(`changed start time from ${oldW.timeStart} to ${newW.timeStart}`);
  }
  if (oldW.type !== newW.type) {
    changes.push(`changed workout type from ${oldW.type} to ${newW.type}`);
  }
  if (oldW.healthKitWorkoutData !== newW.healthKitWorkoutData) {
    changes.push(`changed HealthKit data from ${JSON.stringify(oldW.healthKitWorkoutData)} to ${JSON.stringify(newW.healthKitWorkoutData)}`);
  }
  if (changes.length > 0) {
    return `Changed workout ${oldW.id}: ${changes.join("; ")}`;
  }
  return "";
}

function appendRevision(plan: WeeklyPlan, newRevision: string) {
  plan.revision = plan.revision ? `${plan.revision}; ${newRevision}` : newRevision;
}

function findWorkoutInPlan(
  plan: WeeklyPlan,
  workoutId: string
): { day: WeekdayName; index: number } | null {
  for (const day of dayNames) {
    const idx = plan.workoutsByDay[day].findIndex((w) => w.id === workoutId);
    if (idx >= 0) {
      return { day, index: idx };
    }
  }
  return null;
}

export function hkWorkoutKey(workout: HKWorkout | Workout): string {
  const type = (workout as HKWorkout).workoutType ?? (workout as Workout).type;
  return `${workout.timeStart}-${workout.durationMin}-${type}`;
}

// Add a workout to the plan.
export const addWorkout = (plan: WeeklyPlan, workout: Workout) => {
  const weekday = DateTime.fromISO(workout.timeStart)
    .toFormat("EEEE") as WeekdayName;
  plan.workoutsByDay[weekday].push(workout);
  appendRevision(plan, `Added workout ${workout.id}`);
  return plan;
};

// Update a workout in the plan.
export const updateWorkout = (
  plan: WeeklyPlan,
  workoutId: string,
  updates: Partial<Workout>
) => {
  const found = findWorkoutInPlan(plan, workoutId);
  if (found) {
    const { day: currentDay, index } = found;
    const oldWorkout = plan.workoutsByDay[currentDay][index];
    const updatedWorkout = { ...oldWorkout, ...updates };
    const updatedDate = new Date(updatedWorkout.timeStart);
    const updatedDay = dayNames[updatedDate.getDay()];

    if (updatedDay !== currentDay) {
      plan.workoutsByDay[currentDay].splice(index, 1);
      plan.workoutsByDay[updatedDay].push(updatedWorkout);
    } else {
      plan.workoutsByDay[currentDay][index] = updatedWorkout;
    }

    const revision = computeRevision(oldWorkout, updatedWorkout);
    if (revision) appendRevision(plan, revision);
  } else {
    console.warn(`Workout ${workoutId} not found in the plan`);
  }
  return plan;
};

// Delete a workout from the plan.
export const deleteWorkout = (plan: WeeklyPlan, workoutId: string) => {
  const found = findWorkoutInPlan(plan, workoutId);
  if (found) {
    const { day, index } = found;
    const oldWorkout = plan.workoutsByDay[day][index];
    plan.workoutsByDay[day].splice(index, 1);
    appendRevision(plan, `Deleted workout ${oldWorkout.id}: ${JSON.stringify(oldWorkout)}`);
  } else {
    console.warn(`Workout ${workoutId} not found in the plan`);
  }
  return plan;
};

// Set the completion status of a workout.
export const setCompletion = (
  plan: WeeklyPlan,
  workoutId: string,
  completion: boolean
) => {
  const found = findWorkoutInPlan(plan, workoutId);
  if (found) {
    const { day, index } = found;
    const oldWorkout = plan.workoutsByDay[day][index];
    const updatedWorkout = { ...oldWorkout, completed: completion };
    plan.workoutsByDay[day][index] = updatedWorkout;
    const revision = computeRevision(oldWorkout, updatedWorkout);
    if (revision) appendRevision(plan, revision);
  } else {
    console.warn(`Workout ${workoutId} not found in the plan`);
  }
  return plan;
};

// Dismiss a workout in the plan.
export const dismissWorkout = (plan: WeeklyPlan, workoutId: string) => {
  const found = findWorkoutInPlan(plan, workoutId);
  if (found) {
    const { day, index } = found;
    const oldWorkout = plan.workoutsByDay[day][index];
    const updatedWorkout = { ...oldWorkout, dismissed: true };
    plan.workoutsByDay[day][index] = updatedWorkout;
    const revision = computeRevision(oldWorkout, updatedWorkout);
    if (revision) appendRevision(plan, revision);
  } else {
    console.warn(`Workout ${workoutId} not found in the plan`);
  }
  return plan;
};

// Link HealthKit workouts to a target workout in the plan.
export const linkHKWorkouts = (
  plan: WeeklyPlan,
  planWorkoutId: string,
  hkWorkoutIds: string[]
) => {
  const foundTarget = findWorkoutInPlan(plan, planWorkoutId);
  if (!foundTarget) {
    console.warn(`Target workout with id ${planWorkoutId} not found in the plan`);
    return plan;
  }
  const { day: targetDay, index: targetIndex } = foundTarget;
  const oldTargetWorkout = plan.workoutsByDay[targetDay][targetIndex];
  const targetWorkout = { ...oldTargetWorkout };

  if (!targetWorkout.healthKitWorkoutData) {
    targetWorkout.healthKitWorkoutData = [];
  }

  for (const day of dayNames) {
    plan.workoutsByDay[day] = plan.workoutsByDay[day].filter((workout) => {
      if (workout.isHKWorkout && workout.healthKitWorkoutData?.some(hkEntry => hkWorkoutIds.includes(hkWorkoutKey(hkEntry)))) {
        if (workout.id !== planWorkoutId) {
          workout.healthKitWorkoutData.forEach((hkEntry) => {
            if (hkWorkoutIds.includes(hkWorkoutKey(hkEntry))) {
              targetWorkout.healthKitWorkoutData!.push(hkEntry);
            }
          });
          return false;
        }
      }
      return true;
    });
  }

  const retainedHKData: HKWorkout[] = [];
  targetWorkout.healthKitWorkoutData.forEach((hkw) => {
    if (hkWorkoutIds.includes(hkWorkoutKey(hkw))) {
      retainedHKData.push(hkw);
    } else {
      const workoutDate = new Date(hkw.timeStart);
      const weekday = workoutDate.toLocaleDateString('en-US', { weekday: 'long' }) as WeekdayName;

      const newWorkout: Workout = {
        id: uuidv4(),
        durationMin: hkw.durationMin,
        timeStart: hkw.timeStart,
        type: hkw.workoutType,
        completed: true,
        dismissed: false,
        isPlanWorkout: true,
        healthKitWorkoutData: [hkw],
        isHKWorkout: true,
      };

      plan.workoutsByDay[weekday].push(newWorkout);
    }
  });

  targetWorkout.healthKitWorkoutData = retainedHKData;
  if (targetWorkout.healthKitWorkoutData.length >= 0) {
    targetWorkout.completed = true;
  }

  plan.workoutsByDay[targetDay][targetIndex] = targetWorkout;
  const revision = computeRevision(oldTargetWorkout, targetWorkout);
  if (revision) appendRevision(plan, revision);
  return plan;
};
