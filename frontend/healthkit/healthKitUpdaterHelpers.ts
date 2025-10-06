import { DateTime } from "luxon";
import { HealthKitModule, HKWorkout, QuantityDataPoint, SleepDataPoint } from "./HealthKitModule";
import { sampleTypes } from "./sampleTypes";
import { firestore } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STUDY_ID } from "../config";

/**
 * Fetches HealthKit data and stores it in Firestore
 * @param uid User ID to store data for
 * @param programStartDate The program start date
 */
export async function fetchHealthKitData(
  uid: string,
  programStartDate: Date
): Promise<void> {

  if (!programStartDate) {
    console.error("programStartDate not provided");
    return;
  }

  try {
    const programStartDateTime = DateTime.fromJSDate(programStartDate).startOf("day");
    const now = DateTime.now().startOf("day");

    // Baseline range: [programStartDate - 3 months, programStartDate]
    const baselineStart = programStartDateTime.minus({ months: 3 });
    const baselineEnd = programStartDateTime;

    // Study range: [programStartDate, now]
    const studyStart = programStartDateTime;
    const studyEnd = now;

    // Baseline period logic
    const baselineComplete = await AsyncStorage.getItem("baselineComplete");
    const isBaselineComplete = baselineComplete === "true";

    if (!isBaselineComplete) {
      if (now < programStartDateTime) {
        await uploadBaselineData(uid, baselineStart, baselineEnd);
        // Do NOT mark baselineComplete yet because programStartDate hasn't passed
      } else {
        // Now >= programStartDate => do final baseline upload,
        // then mark complete so we never do it again
        await uploadBaselineData(uid, baselineStart, baselineEnd);
        await AsyncStorage.setItem("baselineComplete", "true");
        console.log(`Baseline data marked as complete in AsyncStorage.`);
      }
    } else {
      console.log("Baseline data is already marked complete. Skipping baseline queries.");
    }

    // Main study period logic
    if (now >= programStartDateTime) {
      await uploadStudyData(uid, studyStart, studyEnd);
    } else {
      console.log("Now is before programStartDate, so no study data to upload yet.");
    }
  } catch (err) {
    console.error("Error in overall health data fetch process:", err);
  }
}

async function uploadBaselineData(uid: string, start: DateTime, end: DateTime) {
  console.log("Uploading Baseline Data...");

  // Create one promise per sample type (except "workout") to handle fetching and writing in parallel
  const promises = sampleTypes
    .filter((t) => t.toLowerCase() !== "workout")
    .map(async (rawType) => {
      const type = rawType.toLowerCase();
      try {
        const results = await HealthKitModule.query({
          sample_type: rawType,
          start_date: start.toISO()!,
          end_date: end.toISO()!,
          interval: "day",
        });

        if (results?.length) {
          for (const entry of results as (QuantityDataPoint | SleepDataPoint)[]) {
            try {
              const timestamp = DateTime.fromISO(entry.startDate).toISODate()!;
              await setDoc(
                doc(firestore, `studies/${STUDY_ID}/users/${uid}/health/${type}/baseline/${timestamp}`),
                {
                  data: entry,
                  period: "baseline",
                  startDate: start.toISO(),
                  endDate: end.toISO(),
                  lastUpdated: new Date().toISOString(),
                }
              );
            } catch (err) {
              console.error(`Error writing baseline data for ${rawType} at ${DateTime.fromISO(entry.startDate).toISODate()}:`, err);
            }
          }
          console.log(`Wrote ${results.length} baseline entries for ${rawType}`);
        } else {
          console.log(`No entries found for ${rawType} in baseline period`);
        }
      } catch (err) {
        console.error(`Error fetching baseline data for ${rawType}:`, err);
      }
    });

  await Promise.all(promises);
  await fetchAndStoreWorkouts("baseline", uid, start, end);
}

async function uploadStudyData(uid: string, start: DateTime, end: DateTime) {
  console.log("Uploading Study Data...");

  const promises = sampleTypes
    .filter((t) => t.toLowerCase() !== "workout")
    .map(async (rawType) => {
      const type = rawType.toLowerCase();
      try {
        const results = await HealthKitModule.query({
          sample_type: rawType,
          start_date: start.toISO()!,
          end_date: end.toISO()!,
          interval: "day",
        });

        if (results?.length) {
          for (const entry of results as (QuantityDataPoint | SleepDataPoint)[]) {
            try {
              const timestamp = DateTime.fromISO(entry.startDate).toISODate()!;
              await setDoc(
                doc(firestore, `studies/${STUDY_ID}/users/${uid}/health/${type}/study/${timestamp}`),
                {
                  data: entry,
                  period: "study",
                  startDate: start.toISO(),
                  endDate: end.toISO(),
                  lastUpdated: new Date().toISOString(),
                }
              );
            } catch (err) {
              console.error(`Error writing study period data for ${rawType} in study period:`, err);
            }
          }
          console.log(`Wrote ${results.length} study period entries for ${rawType}`);
        } else {
          console.log(`No entries for ${rawType} in study period`);
        }
      } catch (err) {
        console.error(`Error fetching study period data for ${rawType}:`, err);
      }
    });

  await Promise.all(promises);
  await fetchAndStoreWorkouts("study", uid, start, end);
}

/**
 * Fetch and store workout data day-by-day.
 * Each day is processed in parallel.
 */
async function fetchAndStoreWorkouts(
  period: "baseline" | "study",
  uid: string,
  start: DateTime,
  end: DateTime
) {
  const days: DateTime[] = [];
  let referenceDay = start.startOf("day");
  const endOfRange = end.endOf("day");
  while (referenceDay <= endOfRange) {
    days.push(referenceDay);
    referenceDay = referenceDay.plus({ days: 1 });
  }

  const workoutPromises = days.map(async (day) => {
    const dayStr = day.toISODate()!;
    try {
      const workouts: HKWorkout[] = await HealthKitModule.fetchWorkouts(
        day.startOf("day").toISO()!,
        day.endOf("day").toISO()!
      );
      await setDoc(
        doc(firestore, `studies/${STUDY_ID}/users/${uid}/health/workout/${period}/${dayStr}`),
        {
          workouts,
          period,
          startDate: start.toISO(),
          endDate: end.toISO(),
          lastUpdated: DateTime.utc().toISO(),
        }
      );
      if (workouts.length > 0) {
        console.log(`Wrote ${workouts.length} ${period} workouts for ${dayStr}`);
      }
    } catch (err) {
      console.error(`Error fetching/storing workouts for ${dayStr} (${period}):`, err);
    }
  });

  await Promise.all(workoutPromises);
  console.log(`All ${period} workouts uploaded.`);
}
