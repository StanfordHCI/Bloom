import { WeeklyPlan } from "./WeeklyPlan";

export function computePlanProgress(plan: WeeklyPlan): number {
  let total = 0;
  let completed = 0;

  Object.values(plan.workoutsByDay).forEach((workouts) => {
    workouts.forEach((w) => {
      if (w.isPlanWorkout) {
        total++;
        if (w.completed) {
          completed++;
        }
      }
    });
  });

  if (total === 0) return 0;
  return completed / total;
}