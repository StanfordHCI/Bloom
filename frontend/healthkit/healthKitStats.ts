import { QuanitityChartData, SleepChartData, WorkoutChartData } from "./transformHKtoChartData";

type CountStats = {
  type: 'count';
  total?: number;
  average?: number;
  unit: string;
};

type RateStats = {
  type: 'rate';
  average: number;
  min: number;
  max: number;
  unit: string;
};

type SleepStats = {
  type: 'sleep';
  avgInBed: number;
  avgAsleep: number;
  unit: string;
};

type WorkoutStats = {
  type: 'workout';
  totalWorkouts: number;
  totalDuration: number; // In hours
  avgDuration: number; // In hours
};

type Stats = CountStats | RateStats | SleepStats | WorkoutStats;

export type { Stats };

export const computeCountStats = (
  barData: QuanitityChartData[],
  statUnit: string,
  aggregationLevel: 'day' | 'week' | 'month'
): CountStats => {
  const validPoints = barData.filter((pt) => pt.y !== null) as Array<{ x: string; y: number }>;
  const sum = validPoints.reduce((acc, cur) => acc + cur.y, 0);
  const count = validPoints.length;

  return {
    type: 'count',
    total: aggregationLevel === 'day' ? sum : undefined,
    average: aggregationLevel !== 'day' ? sum / count : undefined,
    unit: statUnit
  };
};

export const computeRateStats = (
  rateData: QuanitityChartData[],
  statUnit: string,
): RateStats => {
  const validPoints = rateData.filter((pt) => pt.y !== null) as Array<{ x: string; y: number }>;
  const sum = validPoints.reduce((acc, cur) => acc + cur.y, 0);
  const count = validPoints.length;

  const minValue = validPoints.length > 0 ? Math.min(...validPoints.map((p) => p.y)) : 0;
  const maxValue = validPoints.length > 0 ? Math.max(...validPoints.map((p) => p.y)) : 0;
  const avg = count > 0 ? sum / count : 0;

  return {
    type: 'rate',
    average: avg,
    min: minValue,
    max: maxValue,
    unit: statUnit
  };
};

export const computeSleepStats = (
  sleepData: SleepChartData[],
  statUnit: string,
): SleepStats => {
  const validPoints = sleepData.filter((pt) => pt.inBed !== null && pt.asleep !== null) as Array<{
    x: string;
    inBed: number;
    asleep: number;
  }>;

  const totalInBed = validPoints.reduce((sum, cur) => sum + cur.inBed, 0);
  const totalAsleep = validPoints.reduce((sum, cur) => sum + cur.asleep, 0);

  const avgInBed = validPoints.length > 0 ? totalInBed / validPoints.length : 0;
  const avgAsleep = validPoints.length > 0 ? totalAsleep / validPoints.length : 0;

  return {
    type: 'sleep',
    avgInBed: avgInBed, 
    avgAsleep: avgAsleep,
    unit: statUnit
  };
};

export const computeWorkoutStats = (
  workoutData: WorkoutChartData[],
): WorkoutStats => {
  const totalWorkouts = workoutData.reduce((sum, workout) => sum + workout.totalWorkouts, 0);
  const totalDuration = workoutData.reduce((sum, workout) => sum + workout.totalDurationHours, 0);
  const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;

  return {
    type: 'workout',
    totalWorkouts,
    totalDuration,
    avgDuration
  };
};