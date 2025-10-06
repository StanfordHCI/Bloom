import { WorkoutType } from "../../healthkit/workoutTypes";
import { HKWorkout } from "../../healthkit/HealthKitModule";

export type WeekdayName =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export type WorkoutIntensity = "light" | "moderate" | "vigorous";


export interface Workout {
  id: string; // our UUID
  durationMin: number;
  intensity?: WorkoutIntensity;
  location?: string;
  timeStart: string;
  type: WorkoutType;
  completed: boolean;
  dismissed?: boolean; // optional flag to indicate user dismissed this workout (so it doesn't show up in the UI again)
  isPlanWorkout: boolean; // true if this is a planned workout, false if it's a user-added or auto-logged workout
  healthKitWorkoutData?: HKWorkout[]; // optional HealthKit data if this workout was linked to a HealthKit workout
  isHKWorkout: boolean;
}

export interface WeeklyPlan {
  id: string; // Firestore doc ID
  start: string; // ISO timestamp, always a Sunday
  end: string; // ISO timestamp, always a Saturday
  createdAt: string; // ISO timestamp
  isActive: boolean; // is this the current effective plan for its week?
  workoutsByDay: Record<WeekdayName, Workout[]>;
  revision?: string; // textual description of changes (optional)
}
