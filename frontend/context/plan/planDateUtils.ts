import { DateTime } from "luxon";

/**
 * Given two JS `Date` objects, figure out the zero-based week index
 * for the plan's start date relative to the program’s start date.
 *
 * For example, if planStart is exactly the same Sunday as programStart,
 * that’s weekIndex=0. If planStart is the next Sunday, that’s weekIndex=1, etc.
 */
export function getWeekIndexFromStart(planStart: Date, programStart: Date | null): number {
  if (programStart === null) {
    console.error("getWeekIndexFromStart: programStart is null");
    return -1;
  }
  if (planStart < programStart) {
    console.error("Skipping plan doc: planStart is before programStart", {
      planStart,
      programStart,
    });
    return -1;
  }

  const planStartDay = DateTime.fromJSDate(planStart).startOf("day");
  const programStartDay = DateTime.fromJSDate(programStart).startOf("day");
  // difference in days
  const diffDays = planStartDay.diff(programStartDay, "days").days || 0;
  return Math.floor(diffDays / 7);
}

/**
 * Compute how many weeks have passed from `programStart` to `currentDate`.
 */
export function getCurrentWeekIndex(currentDate: Date, programStart: Date): number {
  if (currentDate < programStart) {
    return -1;
  }
  const currentDay = DateTime.fromJSDate(currentDate).startOf("day");
  const programStartDay = DateTime.fromJSDate(programStart).startOf("day");
  const diffDays = currentDay.diff(programStartDay, "days").days || 0;
  return Math.floor(diffDays / 7);
}
