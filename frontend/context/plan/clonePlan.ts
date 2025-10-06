import { WeeklyPlan } from './WeeklyPlan';

export function cloneWeeklyPlan(plan: WeeklyPlan): WeeklyPlan {
  return {
    id: plan.id,
    isActive: plan.isActive,
    revision: '',
    start: plan.start,
    end: plan.end,
    createdAt: plan.createdAt,
    workoutsByDay: {
      Sunday: plan.workoutsByDay?.Sunday?.map((w) => ({ ...w })) ?? [],
      Monday: plan.workoutsByDay?.Monday?.map((w) => ({ ...w })) ?? [],
      Tuesday: plan.workoutsByDay?.Tuesday?.map((w) => ({ ...w })) ?? [],
      Wednesday: plan.workoutsByDay?.Wednesday?.map((w) => ({ ...w })) ?? [],
      Thursday: plan.workoutsByDay?.Thursday?.map((w) => ({ ...w })) ?? [],
      Friday: plan.workoutsByDay?.Friday?.map((w) => ({ ...w })) ?? [],
      Saturday: plan.workoutsByDay?.Saturday?.map((w) => ({ ...w })) ?? [],
    },
  };
}

