import React, { useEffect, useState, useMemo } from "react";
import { View, ActivityIndicator, Alert, SafeAreaView } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import { useAuth } from "../../context/AuthContext";
import EditPlanControl from "./EditPlanControl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DateTimeUtils } from "../../utils/DateTimeUtils";
import { WeeklyPlan, WeekdayName, Workout } from "../../context/plan/WeeklyPlan";
import { DateTime } from "luxon";
import { getWeekIndexFromStart } from "../../context/plan/planDateUtils";

const daysOfWeek: WeekdayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface PlanCreationScreenProps {
  goNext: () => void;
  isOnboarding: boolean;
}

function filterOutHKWorkouts(weeklyPlan: WeeklyPlan): WeeklyPlan {
  return {
    ...weeklyPlan,
    workoutsByDay: Object.fromEntries(
      Object.entries(weeklyPlan.workoutsByDay).map(([day, workouts]) => [
        day as WeekdayName,
        workouts.filter(workout => !workout.isHKWorkout),
      ])
    ) as Record<WeekdayName, Workout[]>,
  };
}

const getStartEndDates = (
  isOnboarding: boolean,
  hasActivePlan: boolean
) => {
  const now = new Date();
  const dayOfWeek = now.getDay();

  let start: Date;
  let end: Date;

  if (isOnboarding) {
    if (dayOfWeek === 0 || dayOfWeek === 1) {
      start = new Date(now);
      if (dayOfWeek === 1) {
        // If today is Monday, set start day to the previous Sunday.
        start.setDate(now.getDate() - 1);
      }
      start.setHours(0, 0, 0, 0);
      const daysUntilSaturday = 6 - start.getDay();
      end = new Date(start);
      end.setDate(start.getDate() + daysUntilSaturday);
      end.setHours(23, 59, 59, 999);
    } else {
      const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      start = new Date(now);
      start.setDate(now.getDate() + daysUntilNextSunday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }
  } else {
    if (hasActivePlan && (dayOfWeek === 0 || dayOfWeek >= 5)) {
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { sunday, saturday } = DateTimeUtils.getSundayAndSaturday(oneWeekFromNow);
      start = sunday;
      end = new Date(saturday);
      end.setHours(23, 59, 59, 999);
    } else {
      const { sunday, saturday } = DateTimeUtils.getSundayAndSaturday(now);
      start = sunday;
      end = new Date(saturday);
      end.setHours(23, 59, 59, 999);
    }
  }
  return { start, end };
};

const createEmptyWeeklyPlan = (
  start: Date,
  end: Date
): WeeklyPlan => {
  const workoutsByDay: Record<WeekdayName, Workout[]> = {
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  const newPlanDocId = `plan-${DateTimeUtils.getCurrentUTCDateTime()}`;
  return {
    id: newPlanDocId,
    start: DateTime.fromJSDate(start).toISODate()!,
    end: DateTime.fromJSDate(end).toISODate()!,
    createdAt: DateTimeUtils.getCurrentUTCDateTime(),
    isActive: true,
    workoutsByDay,
    revision: "Initial weekly plan",
  };
};

const PlanCreationScreen: React.FC<PlanCreationScreenProps> = ({
  goNext,
  isOnboarding,
}) => {
  const { theme } = useTheme();
  const { plansByWeek, programStartDate, updatePlan, initialized, currentPlan, upcomingPlan } = usePlan();
  const { uid } = useAuth();

  // Instead of directly using Boolean(currentPlan), we use our persisted flag.
  const [hasActivePlan, setHasActivePlan] = useState<boolean>(false);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // On mounting, load the persisted flag if available.
  useEffect(() => {
    const loadPlanFlag = async () => {
      try {
        const storedFlag = await AsyncStorage.getItem("hasActivePlan");
        if (storedFlag !== null) {
          console.log("Stored plan flag:", storedFlag);
          // Convert the stored string back to a boolean.
          setHasActivePlan(JSON.parse(storedFlag) as boolean);
        } else {
          // If no stored value, initialize it using currentPlan values.
          const initialFlag = Boolean(currentPlan) || Boolean(upcomingPlan);
          setHasActivePlan(initialFlag);
          await AsyncStorage.setItem("hasActivePlan", JSON.stringify(initialFlag));
        }
      } catch (error) {
        console.error("Error loading plan flag: ", error);
      }
    };

    void loadPlanFlag();
  }, []); // Only run on mount

  // Memoize start and end so they do not get recomputed on every render.
  const { start, end } = useMemo(
    () => getStartEndDates(isOnboarding, hasActivePlan),
    [isOnboarding, hasActivePlan]
  );

  let weekIndex = 0;
  if (programStartDate) {
    weekIndex = getWeekIndexFromStart(start, programStartDate);
  }

  // Load an initial plan if one is not already created in AsyncStorage.
  useEffect(() => {
    const loadInitialPlan = async () => {
      const planUploaded = await AsyncStorage.getItem("planUploaded");
      if (!planUploaded) {
        setPlan(createEmptyWeeklyPlan(start, end));
      }
    };

    void loadInitialPlan();
  }, [start, end]);

  // Update plan after Firebase/Plan initialization.
  useEffect(() => {
    if (initialized) {
      if (plansByWeek[weekIndex]) {
        const updatedPlan = filterOutHKWorkouts(plansByWeek[weekIndex]!);
        setPlan(updatedPlan);
      } else {
        setPlan(createEmptyWeeklyPlan(start, end));
      }
    }
  }, [initialized, plansByWeek, weekIndex, start, end]);

  // Debug: Log plan changes.
  useEffect(() => {
    console.log("PlanCreationScreen plan: ", JSON.stringify(plan));
  }, [plan]);

  if (!plan) {
    return (
      <View style={theme.onboarding.container}>
        <ActivityIndicator size="large" style={{ flex: 1, justifyContent: "center" }} />
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!uid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const hasWorkouts = Object.values(plan.workoutsByDay).some(
        (workouts) => workouts.length > 0
      );
      if (!hasWorkouts) {
        setIsSubmitting(false);
        Alert.alert("Error", "Please add at least one workout to your plan.");
        return;
      }
      // Update the plan in your backend.
      await updatePlan(plan, plansByWeek[weekIndex]?.id);
      // Mark that the plan has been uploaded.
      await AsyncStorage.setItem("planUploaded", "true");
      goNext();
    } catch (error) {
      console.error("Error updating plan:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "white",
      }}
    >
      <View
        style={[
          theme.onboarding.container,
          {
            paddingTop: 10,
            backgroundColor: "white",
          },
        ]}
      >
        <EditPlanControl
          week={weekIndex}
          daysOfWeek={daysOfWeek}
          plan={plan}
          setPlan={setPlan}
          onDone={() => {
            void handleSubmit();
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default PlanCreationScreen;
