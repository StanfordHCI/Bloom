import { DateTime } from "luxon";
import { QuantityDataPoint, SleepDataPoint, WorkoutDataPoint } from "./HealthKitModule";

type QuanitityChartData = {
    x: string;
    y: number | null;
};

type SleepChartData = {
    x: string;
    inBed: number | null;
    asleep: number | null;
};

type WorkoutChartData = WorkoutDataPoint

type ChartData = QuanitityChartData | SleepChartData | WorkoutChartData;

export type { QuanitityChartData, SleepChartData, WorkoutChartData, ChartData };

export const transformCountData = (
    hkData: QuantityDataPoint[],
    start: DateTime,
    end: DateTime,
    interval: 'hour' | 'day'
  ): QuanitityChartData[] => {
  if (hkData.length === 0) return [];

  // Normalize the input data dates for easier comparison
  const normalizedData = hkData.map((point) => ({
    date: DateTime.fromISO(point.startDate),
    value: point.value,
  }));

  const results: Array<{ x: string; y: number | null }> = [];
  let cursor = start;

  while (cursor <= end) {
    const matches = normalizedData.filter((entry) =>
      interval === 'day' ? entry.date.hasSame(cursor, 'day') : entry.date.equals(cursor)
    );

    // If there are multiple matches, take the average and log a warning
    let val: number | null = null;
    if (matches.length > 0) {
      if (matches.length > 1) {
        console.warn(
          `Multiple matches found for ${cursor.toISO()} (${matches.length} values). Averaging them.`
        );
      }
      val =
        matches.reduce((sum, entry) => sum + entry.value, 0) / matches.length;
    }

    const isFuture = cursor > DateTime.now();
    const label = interval === 'hour' ? cursor.toFormat('ha') : cursor.toFormat('MMM d');

    results.push({
      x: label,
      y: isFuture ? null : val, // If the bucket is in the future, show null
    });

    cursor = cursor.plus({ [interval]: 1 });
  }

  return results;
};  

export const transformRateData = (
  hkData: QuantityDataPoint[],
  start: DateTime,
  end: DateTime,
  interval: 'hour' | 'day'
): QuanitityChartData[] => {
  if (hkData.length === 0) return [];

  const normalizedData = hkData.map((point) => ({
    date: DateTime.fromISO(point.startDate),
    value: point.value,
  }));

  const results: QuanitityChartData[] = [];
  let cursor = start;

  while (cursor <= end) {
    const matches = normalizedData.filter((entry) =>
      interval === 'day' ? entry.date.hasSame(cursor, 'day') : entry.date.equals(cursor)
    );

    const avgValue =
      matches.length > 0
        ? matches.reduce((sum, entry) => sum + entry.value, 0) / matches.length
        : null;

    const isFuture = cursor > DateTime.now();
    const label = interval === 'hour' ? cursor.toFormat('ha') : cursor.toFormat('MMM d');

    results.push({
      x: label,
      y: isFuture ? null : avgValue,
    });

    cursor = cursor.plus({ [interval]: 1 });
  }

  return results;
};

export const transformSleepData = (
  hkData: SleepDataPoint[],
  start: DateTime,
  end: DateTime,
  interval: 'hour' | 'day'
): SleepChartData[] => {
  if (hkData.length === 0) return [];

  const normalizedData = hkData.map((point) => ({
    date: DateTime.fromISO(point.startDate),
    inBed: point.inBedDuration ?? 0,
    asleep: point.sleepDuration ?? 0,
  }));

  const results: SleepChartData[] = [];
  let cursor = start;

  while (cursor <= end) {
    const matches = normalizedData.filter((entry) =>
      interval === 'day' ? entry.date.hasSame(cursor, 'day') : entry.date.equals(cursor)
    );

    const totalInBed = matches.reduce((sum, entry) => sum + entry.inBed, 0);
    const totalAsleep = matches.reduce((sum, entry) => sum + entry.asleep, 0);

    const isFuture = cursor > DateTime.now();
    const label = interval === 'hour' ? cursor.toFormat('ha') : cursor.toFormat('MMM d');

    results.push({
      x: label,
      inBed: isFuture ? null : totalInBed / 3600,
      asleep: isFuture ? null : totalAsleep / 3600,
    });

    cursor = cursor.plus({ [interval]: 1 });
  }

  return results;
};