import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainerRef } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import captureError from "../utils/errorHandling";

const ControlSteps = [
  "CheckInWelcome",
  "CheckInMissedWorkouts",
  "CheckInAmbientProgress",
  "CheckInHealth",
  "CheckInCompareGoal",
  "CheckInNewGoal",
  "PlanCreation",
  "ScheduleCheckIn",
  "RescheduleCheckIn",
  "Finished",
] as const;

const TreatmentSteps = [
  "CheckInWelcome",
  "CheckInMissedWorkouts",
  "CheckInAmbientProgress",
  "CheckInChat",
  "ScheduleCheckIn",
  "RescheduleCheckIn",
  "Finished",
] as const;

export type CheckInStep = (typeof ControlSteps | typeof TreatmentSteps)[number];
export type CheckInStepParamList = {
  [K in CheckInStep]: undefined;
};

interface CheckInContextType {
  currentStep: CheckInStep | null;
  nextStepFrom: (step: CheckInStep) => Promise<void>;
  previousStepFrom: (currentStep: CheckInStep) => Promise<void>;
  resetCheckIn: () => Promise<void>;
  navigation: React.RefObject<NavigationContainerRef<CheckInStep>>;
  setAsyncCheckInStorage: (step: CheckInStep) => Promise<void>;
  navigateToStep: (step: CheckInStep) => Promise<void>;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

const STORAGE_KEY = "checkinProgress";

export const isCheckInCompleted = async () => {
  // Check both the old completion indicator and the new one
  const isFinished = await AsyncStorage.getItem(STORAGE_KEY) === "Finished";
  const isCompleted = await AsyncStorage.getItem("checkinCompleted") === "true";

  return isFinished || isCompleted;
};

export const CheckInProvider: React.FC<{
  children: React.ReactNode; navigation: React.RefObject<NavigationContainerRef<CheckInStep>>; onExit: () => void;
}> = ({ children, navigation, onExit }) => {
  const [currentStep, setCurrentStep] = useState<CheckInStep | null>("CheckInWelcome" as CheckInStep);
  const { isControl } = useAuth();

  const resetPlanFlag = async () => {
    try {
      await AsyncStorage.removeItem("hasActivePlan");
    } catch (error) {
      console.error("Error resetting plan flag:", error);
    }
  };

  const finishCheckIn = async () => {
    try {
      console.log("Finishing check-in process");
      setCurrentStep(null);

      // Clear all check-in related storage
      await AsyncStorage.removeItem(STORAGE_KEY);

      // Mark check-in as completed for external components to detect
      await AsyncStorage.setItem("checkinCompleted", "true");
      void resetPlanFlag();

      // Also store completion timestamp
      await AsyncStorage.setItem("lastCheckinCompleted", new Date().toISOString());

      onExit();
      console.log("Check-in process successfully completed");
    } catch (error) {
      console.error("Error finishing check-in:", error);
      captureError(error, "Failed to finish check-in");
    }
  }

  useEffect(() => {
    const loadCheckInStep = async () => {
      try {
        const storedStep = await AsyncStorage.getItem(STORAGE_KEY);
        console.log("Stored check-in step:", storedStep);
        const allSteps = [...ControlSteps, ...TreatmentSteps];
        const validStep = storedStep && allSteps.includes(storedStep as CheckInStep)
          ? (storedStep as CheckInStep)
          : "CheckInWelcome"
        setCurrentStep(validStep);
      } catch (error) {
        console.error("Failed to load check-in step:", error);
      }
    };

    void loadCheckInStep();
  }, []);

  useEffect(() => {
    const checkNavigationReady = setInterval(() => {
      if (!currentStep || !navigation.current) return;
      if (currentStep === "Finished") void finishCheckIn();
      clearInterval(checkNavigationReady);
      console.log("Navigating to:", currentStep);
      navigation.current?.navigate(currentStep);
    }, 100);

    return () => clearInterval(checkNavigationReady);
  }, [currentStep, navigation]);


  const previousStepFrom = async (currentStep: CheckInStep) => {
    try {
      const steps = isControl ? ControlSteps : TreatmentSteps;
      const currentIndex = steps.findIndex((step) => step === currentStep);
      console.log("Current index: ", currentIndex, "Current step: ", currentStep);
      if (currentIndex === -1) {
        throw new Error(`Invalid onboarding step "${currentStep}" for the current flow.`);
      }
      if (currentIndex === 0) {
        setCurrentStep(null);
        onExit();
        return;
      }

      // Special case: If we're going back from ScheduleCheckIn to PlanCreation,
      // we want to keep the context of creating the next week's plan
      if (currentStep === "ScheduleCheckIn" && steps[currentIndex - 1] === "PlanCreation") {
        // Mark that we're navigating backward to preserve the next week's plan context
        await AsyncStorage.setItem("navigatingBackward", "true");
        await AsyncStorage.setItem(STORAGE_KEY, "PlanCreation");
        setCurrentStep("PlanCreation");
        navigation.current?.navigate("PlanCreation" as never);
        return;
      }

      // Special case: If we're in CheckInAmbientProgress and there were no missed workouts,
      // we should go back to Welcome instead of MissedWorkouts
      if (currentStep === "CheckInAmbientProgress") {
        const previousPlan = await AsyncStorage.getItem("previousPlanHadMissedWorkouts");
        if (previousPlan === "false") {
          await AsyncStorage.setItem(STORAGE_KEY, "CheckInWelcome");
          setCurrentStep("CheckInWelcome");
          navigation.current?.navigate("CheckInWelcome" as never);
          return;
        }
      }

      let prevStep = steps[currentIndex - 1];
      if (prevStep === "RescheduleCheckIn") {
        prevStep = steps[currentIndex - 2];
      } else if (prevStep === "ScheduleCheckIn") {
        prevStep = "CheckInWelcome";
      }

      await AsyncStorage.setItem(STORAGE_KEY, prevStep);
      setCurrentStep(prevStep);
      console.log("Navigated back to:", prevStep);
      navigation.current?.navigate(prevStep as never);
    } catch (error) {
      captureError(error, "Failed to revert check-in step");
    }
  };

  const nextStepFrom = async (step: CheckInStep) => {
    try {
      console.log("Advancing check-in step:", step);
      const steps = isControl ? ControlSteps : TreatmentSteps;
      const currentIndex = steps.findIndex(s => s === step);
      if (currentIndex === -1) {
        throw new Error(`Invalid check-in step "${step}" for the current flow.`);
      }
      let nextStep = steps[currentIndex + 1];

      // If we're in Welcome/MissedWorkouts and next is MissedWorkouts/AmbientProgress,
      // but we have no missed workouts, skip directly to AmbientProgress
      if (
        (step === "CheckInWelcome" && nextStep === "CheckInMissedWorkouts") ||
        (step === "CheckInMissedWorkouts" && nextStep === "CheckInAmbientProgress")
      ) {
        const hasMissedWorkouts = await AsyncStorage.getItem("previousPlanHadMissedWorkouts");
        console.log("Has missed workouts:", hasMissedWorkouts);
        if (hasMissedWorkouts === "false") {
          nextStep = "CheckInAmbientProgress";
        }
      } else if (step === "ScheduleCheckIn") {
        nextStep = "Finished";
      }

      // List of screens that require user interaction so we don't auto-advance:
      const screensRequiringInteraction = [
        "CheckInHealth",
        "CheckInProgress",
        "CheckInCompareGoal",
        "CheckInNewGoal",
        "PlanCreation",
        "CheckInChat",
        "ScheduleCheckIn",
      ];

      // Special case: If current step is ScheduleCheckIn, we've completed the check-in process
      if (step === "ScheduleCheckIn") {
        console.log("Check-in process completed from ScheduleCheckIn.");
        await finishCheckIn();
        return;
      }

      // If nextStep is one that requires interaction, just navigate there
      if (nextStep && screensRequiringInteraction.includes(nextStep)) {
        await AsyncStorage.setItem(STORAGE_KEY, nextStep);
        setCurrentStep(nextStep);
        console.log("Navigating to screen requiring interaction:", nextStep);
        return;
      }

      // No more steps => finish
      if (nextStep === "Finished") {
        console.log("Check-in process completed.");
        await finishCheckIn();
        return;
      }

      // Otherwise, navigate to the next step
      await AsyncStorage.setItem(STORAGE_KEY, nextStep);
      setCurrentStep(nextStep);
      console.log("Stored check-in step:", nextStep);
    } catch (error) {
      console.error("Failed to advance check-in step:", error);
    }
  };

  const resetCheckIn = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setCurrentStep("CheckInWelcome");
  };

  const setAsyncCheckInStorage = async (step: CheckInStep) => {
    await AsyncStorage.setItem(STORAGE_KEY, step);
  };

  const navigateToStep = async (step: CheckInStep) => {
    if (!navigation.current) {
      console.error("CheckIn Navigation container not ready.");
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, step);
    setCurrentStep(step);
  };

  return (
    <CheckInContext.Provider
      value={{
        currentStep,
        nextStepFrom,
        previousStepFrom,
        resetCheckIn,
        navigation,
        setAsyncCheckInStorage,
        navigateToStep,
      }}
    >
      {children}
    </CheckInContext.Provider>
  );
};

export const useCheckIn = (): CheckInContextType => {
  const context = useContext(CheckInContext);
  if (!context) {
    throw new Error("useCheckIn must be used within a CheckInProvider");
  }
  return context;
};
