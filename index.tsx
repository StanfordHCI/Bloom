import React from "react";
import { AppRegistry } from "react-native";
import App from "./frontend/App";
import { AuthProvider } from "./frontend/context/AuthContext";
import { ThemeProvider, gardenTheme } from "./frontend/context/ThemeContext";
import * as Sentry from "@sentry/react-native";
import { OnboardingStep, OnboardingProvider } from "./frontend/context/OnboardingContext";
import { createNavigationContainerRef } from "@react-navigation/native";
import { AmbientDisplayProvider } from "./frontend/context/AmbientDisplayContext";
import { WeeklyPlanProvider } from "./frontend/context/plan/WeeklyPlanContext";
import { ErrorModalProvider } from "./frontend/context/ErrorModalContext";
import { initConsoleInterceptor } from "./frontend/utils/loggingService";

export const onboardingNavigationRef = createNavigationContainerRef<OnboardingStep>();

export const sentryNavigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

const BloomApp = () => {
  return (
    <AuthProvider>
      <OnboardingProvider navigation={onboardingNavigationRef}>
        <ErrorModalProvider>
          <ThemeProvider initialTheme={gardenTheme}>
            <AmbientDisplayProvider>
              <WeeklyPlanProvider>
                <App />
              </WeeklyPlanProvider>
            </AmbientDisplayProvider>
          </ThemeProvider>
        </ErrorModalProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
};

initConsoleInterceptor();

AppRegistry.registerComponent("BloomApp", () => BloomApp);
