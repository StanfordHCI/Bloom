import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getDoc,
  setDoc,
  doc,
  onSnapshot,
  collection,
  updateDoc
} from "firebase/firestore";
import { firestore } from "../../firebase.ts";
import { WeeklyPlan, WeekdayName } from "./WeeklyPlan.ts";
import { useAuth } from "../../context/AuthContext";
import { STUDY_ID } from "../../config.ts";
import * as Sentry from "@sentry/react-native";
import captureError from "../../utils/errorHandling.ts";
import { getWeekIndexFromStart, getCurrentWeekIndex } from "./planDateUtils.ts";
import { validateWeeklyPlanDoc } from "./planValidation.ts";
import { DateTime } from "luxon";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { computePlanProgress } from "./computeProgress";
import { useAmbientDisplay } from "../../context/AmbientDisplayContext";
import { DateTimeUtils } from "../../utils/DateTimeUtils.ts";
import { cloneWeeklyPlan } from "./clonePlan.ts";

export interface WeeklyPlanContextType {
  plansByWeek: Array<WeeklyPlan | null>;
  loading: boolean;
  initialized: boolean;
  currentDay: WeekdayName;
  currentWeekIndex: number;
  currentPlan: WeeklyPlan | null;
  upcomingPlan?: WeeklyPlan | null;
  currentPlanID: string | null;
  currentProgress: number;
  programStartDate: Date | null;
  updatePlan: (updatedPlan: WeeklyPlan, oldPlanId: string | undefined) => Promise<void>;
  modifyAndUpdatePlan: (modifications: Array<(plan: WeeklyPlan) => WeeklyPlan>, plan: WeeklyPlan) => Promise<void>;
  checkInTimeLocal: DateTime | null;
  checkInState: string | null;
}

export const WeeklyPlanContext = createContext<WeeklyPlanContextType | null>(
  null
);

export const WeeklyPlanProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { uid } = useAuth();
  const { updateAmbientDisplay } = useAmbientDisplay();

  // Debug override date for testing. If null, we use actual new Date().
  const [debugDate, setDebugDate] = useState<Date | null>(null);

  // The date when the user started their program (stored as a field in their Firebase user doc)
  const [programStartDate, setProgramStartDate] = useState<Date | null>(null);

  // this is neccessary for the setPlan function to allways contain the latest programStartDate
  const programStartDateRef = useRef<Date | null>(null);
  useEffect(() => {
    programStartDateRef.current = programStartDate;
  }, [programStartDate]);
  // Dynamic array of plan docs. index = plan's "week index" since programStartDate.
  // If the user goes 8 weeks, we'll have indexes [0..7], possibly with some nulls if no plan doc for a certain week.
  const [fetchedPlansByWeek, setFetchedPlansByWeek] = useState<Array<WeeklyPlan | null>>([]);
  const [localPlansByWeek, setLocalPlansByWeek] = useState<Array<WeeklyPlan | null>>([]); // optimistic local updates
  const [plansByWeek, setPlansByWeek] = useState<Array<WeeklyPlan | null>>([]); // contain latest of fetched and local plans

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!initialized) {
        console.error("WeeklyPlanProvider not initialized after 5 seconds. Manually initializing, plan will be empty.");
        setLoading(false);
        setInitialized(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [initialized]);

  // Check-in state
  const [checkInTimeLocal, setCheckInTimeLocal] = useState<DateTime | null>(null);
  const [checkInState, setCheckInState] = useState<string | null>(null);

  // 1. Listen to user doc for programStartDate
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);

    const unsubscribeUserDoc = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          console.log("No user doc found for uid", uid);
          setProgramStartDate(null);
          setLoading(false);
          return;
        }
        const data = docSnap.data();
        const psd = data.programStartDate as string | undefined;
        if (psd && typeof psd === "string") {
          // parse the programStartDate from ISO
          const dt = DateTime.fromISO(psd);
          if (dt.isValid) {
            setProgramStartDate(dt.toJSDate());
          } else {
            setProgramStartDate(null);
          }
        } else {
          setProgramStartDate(null);
        }
        setLoading(false);
      },
      (error) => {
        captureError(error, "Error listening to user doc");
        setLoading(false);
      }
    );

    return () => unsubscribeUserDoc();
  }, [uid]);

  // 2. Listen to the user's "plans" subcollection
  useEffect(() => {
    if (!uid) return; // no user => skip
    if (!programStartDate) return; // no programStartDate => skip

    const plansRef = collection(firestore, `studies/${STUDY_ID}/users/${uid}/plans`);

    const unsubscribePlanCollection = onSnapshot(
      plansRef,
      (snapshot) => {
        setLoading(true);

        const processSnapshot = async () => {
          const newPlans: Array<WeeklyPlan | null> = [];

          try {
            for (const docSnap of snapshot.docs) {
              const docData = docSnap.data() as Partial<WeeklyPlan>;
              try {
                let plan: WeeklyPlan;
                try {
                  plan = validateWeeklyPlanDoc(docData, docSnap.id);
                } catch (err) {
                  console.error("Invalid plan doc:", docSnap.id, "Has error:", err);
                  continue;
                }
                const planWeekIndex = getWeekIndexFromStart(
                  DateTime.fromISO(plan.start).toJSDate(),
                  programStartDate
                );

                if (planWeekIndex < 0) {
                  console.error("Skipping plan doc with invalid week index:", docSnap.id);
                  continue;
                }

                // Expand the newPlans array if needed.
                if (planWeekIndex >= newPlans.length) {
                  const needed = planWeekIndex - newPlans.length + 1;
                  for (let i = 0; i < needed; i++) {
                    newPlans.push(null);
                  }
                }

                const existing = newPlans[planWeekIndex];
                if (!existing) {
                  newPlans[planWeekIndex] = plan;
                } else {
                  // Both plans are active: choose the one with the later createdAt timestamp.
                  if (plan.isActive && existing.isActive) {
                    const planCreatedAt = DateTime.fromISO(plan.createdAt);
                    const existingCreatedAt = DateTime.fromISO(existing.createdAt);
                    newPlans[planWeekIndex] =
                      planCreatedAt > existingCreatedAt ? plan : existing;
                  } else if (plan.isActive && !existing.isActive) {
                    // If the new plan is active and the existing one is inactive, use the new plan.
                    newPlans[planWeekIndex] = plan;
                  }
                  // Otherwise, if the existing plan is active (or both are inactive), keep the existing one.
                }
              } catch (err) {
                captureError(err, `Skipping invalid plan doc ${docSnap.id}`);
              }
            }

            // Check for multiple active plans in the current date range.
            const activePlans = newPlans.filter((p) => p?.isActive);
            const now = new Date();
            const currentPlans = activePlans.filter(
              (p) =>
                p &&
                now >= DateTime.fromISO(p.start).toJSDate() &&
                now <= DateTime.fromISO(p.end).toJSDate()
            );

            if (currentPlans.length > 1) {
              console.warn(
                "Multiple active plans found for the current date."
              );
            }

            if (currentPlans.length === 0) {
              console.warn("No active plans found for the current date.");
            }

            // Only update if there is at least one active plan.
            if (newPlans.some((p) => p?.isActive)) {
              setFetchedPlansByWeek(newPlans);
            }

            // Always trigger the ambient display update
            // Backend will sanitize plan history
            try {
              console.log("Triggering manual ambient display update");
              await updateAmbientDisplay();
            } catch (err) {
              captureError(err, "WidgetBridge update error");
            }

            setInitialized(true);
          } catch (error) {
            captureError(error, "Error processing plans in onSnapshot");
          } finally {
            setLoading(false);
          }
        };

        void processSnapshot();
      },
      (error) => {
        captureError(error, "Error listening for weekly plan updates");
        setLoading(false);
      }
    );

    return () => unsubscribePlanCollection();
  }, [uid, programStartDate]);


  useEffect(() => {
    if (fetchedPlansByWeek.length == localPlansByWeek.length) {
      // sort both arrays by createdAt, choose latest one
      const latestFetchedPlanDate = fetchedPlansByWeek
        .filter(plan => plan !== null)
        .reduce((latest, plan) => {
          const createdAt = DateTime.fromISO(plan.createdAt).toMillis();
          return Math.max(latest, createdAt);
        }, 0);

      // Get latest date from localPlansByWeek
      const latestLocalPlanDate = localPlansByWeek
        .filter(plan => plan !== null && plan !== undefined)
        .reduce((latest, plan) => {
          const createdAt = DateTime.fromISO(plan.createdAt).toMillis();
          return Math.max(latest, createdAt);
        }, 0);

      if (latestFetchedPlanDate > latestLocalPlanDate) {
        if (JSON.stringify(fetchedPlansByWeek) !== JSON.stringify(plansByWeek)) {
          setLocalPlansByWeek(fetchedPlansByWeek);
          setPlansByWeek(fetchedPlansByWeek);
        }
      }
      if (JSON.stringify(localPlansByWeek) !== JSON.stringify(plansByWeek)) {
        setPlansByWeek(localPlansByWeek);
      }
    } else if (fetchedPlansByWeek.length > localPlansByWeek.length) {
      if (JSON.stringify(fetchedPlansByWeek) !== JSON.stringify(plansByWeek)) {
        setLocalPlansByWeek(fetchedPlansByWeek);
        setPlansByWeek(fetchedPlansByWeek);
      }
    } else {
      if (JSON.stringify(localPlansByWeek) !== JSON.stringify(plansByWeek)) {
        setPlansByWeek(localPlansByWeek);
      }
    }
  }, [localPlansByWeek, fetchedPlansByWeek]);

  const setPlan = useCallback((plan: WeeklyPlan) => {
    const effectiveStart = programStartDateRef.current ?? DateTime.now().toJSDate();
    const planWeekIndex = getWeekIndexFromStart(
      DateTime.fromISO(plan.start).toJSDate(),
      effectiveStart
    );

    const updatePlansByWeek = [...plansByWeek];
    if (plansByWeek.length < planWeekIndex) {
      updatePlansByWeek.push(plan);
    } else {
      updatePlansByWeek[planWeekIndex] = plan;
    }
    setLocalPlansByWeek(updatePlansByWeek);
  }, [plansByWeek, localPlansByWeek]);

  const currentDay = useMemo(() => {
    const now = debugDate ?? new Date();
    return now.toLocaleDateString("en-US", { weekday: "long" }) as WeekdayName;
  }, [debugDate]);

  const currentWeekIndex = useMemo(() => {
    if (!programStartDate) return 0;
    const now = debugDate ?? new Date();
    return getCurrentWeekIndex(now, programStartDate);
  }, [programStartDate, debugDate]);

  const currentPlan: WeeklyPlan | null =
    currentWeekIndex < 0 || currentWeekIndex >= plansByWeek.length
      ? null
      : plansByWeek[currentWeekIndex];
  const currentPlanID = currentPlan?.id ?? null;

  const upcomingPlan = useMemo(() => {
    const now = debugDate ?? new Date();
    if (currentPlan && DateTime.fromISO(currentPlan.start).toJSDate() > now) {
      return null;
    }
    let best: WeeklyPlan | null = null;
    let bestStart: Date | null = null;
    for (const plan of plansByWeek) {
      if (!plan) continue;
      const planStart = DateTime.fromISO(plan.start).toJSDate();
      if (planStart >= now) {
        if (!best || planStart < (bestStart ?? Infinity)) {
          best = plan;
          bestStart = planStart;
        }
      }
    }
    return best;
  }, [currentPlan, plansByWeek, debugDate]);

  const currentProgress = useMemo(() => {
    if (!currentPlan) return 0;
    return computePlanProgress(currentPlan);
  }, [currentPlan]);
  /**
   * Utility to compare old vs. new workout fields and build a revision summary.
   * E.g. "Changed durationMin from 30 to 45; intensity from moderate to vigorous"
   */

  const updatePlan = useCallback(
    async (updatedPlan: WeeklyPlan, oldPlanId: string | undefined) => {
      if (!uid || !updatedPlan.id) return;

      if (oldPlanId) {
        const oldPlanRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}/plans/${oldPlanId}`);
        const oldSnap = await getDoc(oldPlanRef);
        if (!oldSnap.exists()) {
          console.warn(`Plan doc not found for id: ${oldPlanId}. This is ok, if a new plan is created`);
        }
        await updateDoc(oldPlanRef, { isActive: false });
      }

      const userRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists() || userSnap.data().programStartDate == null) {
        await setDoc(userRef, { programStartDate: updatedPlan.start }, { merge: true });
      }
      const newPlanDocId = `plan-${DateTimeUtils.getCurrentUTCDateTime()}`;

      updatedPlan.id = newPlanDocId;
      updatedPlan.createdAt = DateTimeUtils.getCurrentUTCDateTime();
      updatedPlan.isActive = true;

      // Optimistically update the plan in the UI
      setPlan(updatedPlan);
      const newPlanRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}/plans/${newPlanDocId}`);

      try {
        await setDoc(newPlanRef, updatedPlan);
      } catch (error) {
        captureError(error, "Error setting new plan doc");
        console.error("Error setting new plan doc", error);
      }

      Sentry.addBreadcrumb({
        category: "workflow",
        message: "Plan modified & new plan doc created",
        level: "info",
      });
    },
    [uid, programStartDate]
  );

  /**
  * Pipeline function that takes:
  *  - a plan to update,
  *  - an array of modifications (each a function that accepts a plan and returns a modified plan),
  *
  * The function clones the plan, applies each modification in order, then calls the update function.
  */
  const modifyAndUpdatePlan = useCallback(
    async (
      modifications: Array<(plan: WeeklyPlan) => WeeklyPlan>,
      plan: WeeklyPlan
    ) => {
      if (!plan) {
        console.error("No current plan available for pipeline update");
        return;
      }
      let updatedPlan = cloneWeeklyPlan(plan);
      modifications.forEach((modify) => {
        updatedPlan = modify(updatedPlan);
      });
      await updatePlan(updatedPlan, plan.id);
    },
    [currentPlan, updatePlan]
  );


  // Check-in state listener
  useEffect(() => {
    if (!uid) {
      setCheckInTimeLocal(null);
      setCheckInState(null);
      return;
    }

    const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
    const unsub = onSnapshot(userDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        setCheckInTimeLocal(null);
        setCheckInState(null);
        return;
      }
      const data = snapshot.data();
      if (!data?.checkinTime || typeof data.checkinTime !== "string") {
        setCheckInTimeLocal(null);
        setCheckInState(null);
        return;
      }

      const dtLocal = DateTime.fromISO(data.checkinTime).toLocal();
      console.log("Check-in listener setting checkinTime:", dtLocal.toISO());
      setCheckInTimeLocal(dtLocal);
    });

    return () => unsub();
  }, [uid]);

  // Check-in scenario computation
  useEffect(() => {
    if (!checkInTimeLocal) {
      setCheckInState(null);
      return;
    }

    const now = DateTime.local();
    const isFuture = checkInTimeLocal > now;
    const dayOfWeek = now.weekday % 7; // 0=Sun, 1=Mon,... 6=Sat
    const hasPlan = !!currentPlan || !!upcomingPlan;

    let scenario: string | null = null;

    if (hasPlan) {
      if (isFuture) { // checkinTime in future
        if (!upcomingPlan && (dayOfWeek === 5 || dayOfWeek === 6)) {
          scenario = "upcoming-active"; // You can start checkin on Fri/Sat
        } else {
          scenario = "upcoming-inactive"; // You can't start checkin on other days, but you can reschedule
        }
      } else { // checkinTime is past
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          scenario = "active"; // You can start checkin on Fri/Sat
        } else {
          scenario = "error-present"; // current plan, checkinTime in past, but not Fri/Sat
          console.error(`Unexpected check-in scenario error-present encountered: (dayOfWeek=${dayOfWeek}, hasPlan=${hasPlan}, isFuture=${isFuture})`);
        }
      }
    } else { // no current plan
      if (isFuture) { // checkinTime in future
        if (dayOfWeek === 0) {
          scenario = "upcoming-active"; // You can start checkin on Sunday
        } else {
          scenario = "error-missing"; // No plan, checkinTime in future, but not Sunday
          console.error(`Unexpected check-in scenario error-missing encountered: (dayOfWeek=${dayOfWeek}, hasPlan=${hasPlan}, isFuture=${isFuture})`);
        }
      } else { // checkinTime is past
        if (dayOfWeek === 0) {
          scenario = "active"; // You can start checkin on Sunday
        } else {
          scenario = "missed"; // You missed checkin on Sunday and don't have a plan
        }
      }
    }

    console.log("Check-in state:", scenario);
    setCheckInState(scenario);

  }, [checkInTimeLocal, currentPlan, upcomingPlan]);

  const value: WeeklyPlanContextType = {
    plansByWeek,
    loading,
    initialized,
    currentDay,
    currentWeekIndex,
    currentPlan,
    upcomingPlan,
    currentPlanID,
    currentProgress,
    programStartDate,
    checkInTimeLocal,
    checkInState,
    updatePlan,
    modifyAndUpdatePlan
  };

  const handlePrevDay = useCallback(() => {
    setDebugDate((prev) => {
      if (!prev) return new Date();
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setDebugDate((prev) => {
      if (!prev) return new Date();
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  return (
    <WeeklyPlanContext.Provider value={value}>
      {children}

      <View style={[
        styles.debugOverlay,
        { display: "none" },
      ]}>
        <TouchableOpacity onPress={handlePrevDay} style={styles.debugButton}>
          <Text style={styles.debugButtonText}>{"←"}</Text>
        </TouchableOpacity>

        <Text style={styles.debugText}>
          {currentDay} (Week #{currentWeekIndex + 1}) ({currentPlanID})
        </Text>

        <TouchableOpacity onPress={handleNextDay} style={styles.debugButton}>
          <Text style={styles.debugButtonText}>{"→"}</Text>
        </TouchableOpacity>
      </View>
    </WeeklyPlanContext.Provider>
  );
};

const styles = StyleSheet.create({
  debugOverlay: {
    position: "absolute",
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    zIndex: 9999,
  },
  debugButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 10,
  },
  debugButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    flexWrap: "wrap",
  },
  debugText: {
    color: "#fff",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 10,
  },
});

export const usePlan = () => {
  const context = React.useContext(WeeklyPlanContext);
  if (!context) {
    throw new Error("usePlan must be used within a WeeklyPlanProvider");
  }
  return context;
}
