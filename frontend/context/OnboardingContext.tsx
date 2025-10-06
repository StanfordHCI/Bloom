import React, { createContext, useContext, useEffect, useState } from "react";
import { NativeModules, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainerRef } from "@react-navigation/native";
import captureError from "../utils/errorHandling";
import { useAuth } from "./AuthContext";
import { ONBOARDING_STORAGE_KEY } from "../config";

const ControlSteps = [
  "StudyCode",
  "Welcome",
  "SignUp",
  "SignIn",
  "WelcomeToBloom",
  "Avatar",
  "HelloGarden",
  "HelloGarden2",
  "PrivacyDisclaimersControl",
  "HealthDisclaimers",
  "HealthKitPermissions",
  "NotificationPermissions",
  "AvatarQuestions",
  "PastExperience",
  "Barriers",
  "Motivation",
  "GoalSetting",
  "PlanCreation",
  "AdviceResources",
  "ScheduleCheckIn",
  "Finished",
] as const;

const TreatmentSteps = [
  "StudyCode",
  "Welcome",
  "SignUp",
  "SignIn",
  "WelcomeToBloom",
  "Avatar",
  "HelloGarden",
  "HelloGarden2",
  "PrivacyDisclaimers",
  "HealthDisclaimers",
  "HealthKitPermissions",
  "NotificationPermissions",
  "AvatarQuestions",
  "OnboardingChat",
  "ScheduleCheckIn",
  "Finished",
] as const;

// Reinstallation: if onboarding has already been completed, just ask for system permissions
const ReinstallSteps = [
  "StudyCode",
  "Welcome",
  "SignUp",
  "SignIn",
  "HealthKitPermissions",
  "NotificationPermissions",
  "Finished",
] as const;

export type OnboardingStep = (typeof ControlSteps | typeof TreatmentSteps | typeof ReinstallSteps)[number];

type OnboardingContextType = {
  currentStep: OnboardingStep | null;
  nextStepFrom: (currentStep: OnboardingStep) => Promise<void>;
  previousStepFrom: (currentStep: OnboardingStep) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  skipOnboarding: () => void;
  requestHealthKitPermissions: () => Promise<void>;
  enableNotifications: () => Promise<void>;
  navigation: React.RefObject<NavigationContainerRef<OnboardingStep>>;
  isAdvancing: boolean;
};

type HealthKitModuleType = {
  requestPermissions: () => Promise<boolean>;
};

type NotificationBridgeType = {
  handleNotificationsAllowed: () => Promise<void>;
  verifyAndStoreAPNSToken: () => Promise<void>;
};

const { HealthKitModule, NotificationBridge } = NativeModules as {
  HealthKitModule: HealthKitModuleType;
  NotificationBridge: NotificationBridgeType;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const isOnboardingCompleted = async () => {
  return await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY) === 'Finished';
}

export const deleteOnboardingProgress = async () => {
  await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export const OnboardingProvider: React.FC<{
  children: React.ReactNode;
  navigation: React.RefObject<NavigationContainerRef<OnboardingStep>>
}> = ({ children, navigation }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Pull these from Auth
  const { isControl, completeOnboarding, firebaseOnboardingComplete, getFirebaseOnboardingPromise } = useAuth();

  const resetPlanFlag = async () => {
    try {
      await AsyncStorage.removeItem("hasActivePlan");
    } catch (error) {
      console.error("Error resetting plan flag:", error);
    }
  };

  useEffect(() => {
    const loadOnboardingStep = async () => {
      try {
        const storedStep = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        console.log("Stored onboarding step:", storedStep);

        const allSteps = [...ControlSteps, ...TreatmentSteps, ...ReinstallSteps];
        const validStep = storedStep && allSteps.includes(storedStep as OnboardingStep)
          ? (storedStep as OnboardingStep)
          : "StudyCode";

        setCurrentStep(validStep);
      } catch (error) {
        captureError(error, "Failed to load onboarding step");
      }
    };

    void loadOnboardingStep();
  }, []);

  useEffect(() => {
    const checkNavigationReady = setInterval(() => {
      if (currentStep === "Finished") {
        clearInterval(checkNavigationReady); // Clear the interval immediately
        void resetPlanFlag();
        completeOnboarding();
        return; // Optional: to skip further processing in this interval tick
      }

      if (!navigation.current) return;

      if (navigation.current?.isReady()) {
        clearInterval(checkNavigationReady);
        console.log("Navigating to:", currentStep);
        navigation.current?.navigate(currentStep as never);
      }
    }, 100);

    return () => clearInterval(checkNavigationReady);
  }, [currentStep, navigation]);

  const previousStepFrom = async (currentStep: OnboardingStep) => {
    try {
      setIsAdvancing(true);
      const steps =
        firebaseOnboardingComplete === true
          ? ReinstallSteps
          : isControl
            ? ControlSteps
            : TreatmentSteps;

      const currentIndex = steps.findIndex((step) => step === currentStep);
      if (currentIndex === -1) {
        throw new Error(`Invalid onboarding step "${currentStep}" for the current flow.`);
      }
      if (currentIndex === 0) {
        return;
      }
      let prevStep = steps[currentIndex - 1];
      if (currentStep === "SignIn") {
        prevStep = steps[currentIndex - 2];
      }
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, prevStep);
      setCurrentStep(prevStep);
      console.log("Navigated back to:", prevStep);
      navigation.current?.navigate(prevStep as never);
    } catch (error) {
      captureError(error, "Failed to revert onboarding step");
    } finally {
      setIsAdvancing(false);
    }
  };

  const nextStepFrom = async (currentStep: OnboardingStep) => {
    try {
      setIsAdvancing(true);
      console.log("Advancing onboarding step:", currentStep);
      let steps: readonly OnboardingStep[];

      if (currentStep === "SignIn") {
        // Wait for the user doc to load by awaiting the promise
        console.log("Fetching firebaseOnboardingComplete via the promise ...");
        const fetchedResult = await Promise.race([
          getFirebaseOnboardingPromise(),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 5000)
          )
        ]);
        // `fetchedResult` is either true or false, as resolved by onSnapshot
        console.log("Fetched firebaseOnboardingComplete:", fetchedResult);

        if (fetchedResult === true) {
          steps = ReinstallSteps;
        } else {
          steps = isControl ? ControlSteps : TreatmentSteps;
        }
      } else {
        // Use normal logic if we’re not just after SignIn
        steps =
          firebaseOnboardingComplete === true
            ? ReinstallSteps
            : isControl
              ? ControlSteps
              : TreatmentSteps;
      }

      const currentIndex = steps.findIndex(step => step === currentStep);
      if (currentIndex === -1) {
        throw new Error(`Invalid onboarding step "${currentStep}" for the current flow.`); // important for typing
      }
      let nextStep = steps[currentIndex + 1];
      console.log("Next step:", nextStep);
      switch (nextStep) {
        case "SignIn": // always skip sign in
          nextStep = steps[currentIndex + 2];
          console.log("Next step: ", nextStep);
          break;
        default:
          break;
      }
      console.log("Next step after switch:", nextStep);

      if (nextStep === "Finished") {
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "Finished");
        console.log("Onboarding completed.");
        setCurrentStep("Finished");
        completeOnboarding();
      } else if (nextStep) {
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, nextStep);
        setCurrentStep(nextStep);
        console.log("Stored onboarding step:", nextStep);
      } else {
        console.log("No next step found.");
      }
    } catch (error) {
      captureError(error, "Failed to advance onboarding step");
    } finally {
      console.log("Finished advancing onboarding step");
      setIsAdvancing(false);
    }
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setCurrentStep("StudyCode");
  };

  const enableNotifications = async () => {
    try {
      await NotificationBridge.handleNotificationsAllowed();
      await NotificationBridge.verifyAndStoreAPNSToken();
    } catch (error) {
      captureError(error, "Failed to request notification permissions");
      Alert.alert("Error", `Failed to request notification permissions: ${String(error)}`);
    }
  };

  const requestHealthKitPermissions = async () => {
    try {
      await HealthKitModule.requestPermissions();
    } catch (error) {
      captureError(error, "Failed to request HealthKit permissions");
      Alert.alert("Error", `Failed to request HealthKit permissions: ${String(error)}`);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return (
    <OnboardingContext.Provider
      value={{
        skipOnboarding,
        currentStep,
        nextStepFrom,
        previousStepFrom,
        resetOnboarding,
        enableNotifications,
        requestHealthKitPermissions,
        navigation,
        isAdvancing
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
