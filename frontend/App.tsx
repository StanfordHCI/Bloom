import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, AppState, AppStateStatus } from "react-native";
import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { useAuth } from "./context/AuthContext";
import OnboardingNavigator from "./onboarding/OnboardingNavigator";
import { AppNavigator, NavigationViews } from "./navigation/AppNavigator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";
import { USE_SENTRY } from "./config";
import { sentryNavigationIntegration } from "../index";
import { useErrorModal } from "./context/ErrorModalContext";
import ErrorModal from "./components/feedback/ErrorModal";
import { initSentry } from "./utils/initSentry";
import { useTimezoneUpdater } from "./utils/useTimezoneUpdater";
import { useAPNSTokenUpdater } from "./utils/useAPNSTokenUpdater";
import AuthModal from "./screens/AuthModal";
import { logEvent } from "./utils/loggingService";

const LoadingIndicator = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" />
  </View>
);

const SentryWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isSentryInitialized, setIsSentryInitialized] = useState(false);
  const { showErrorModal } = useErrorModal();
  const { showAuthModal } = useAuth();

  useEffect(() => {
    const initializeSentry = () => {
      try {
        initSentry(showErrorModal);
        setIsSentryInitialized(true);
      } catch (error) {
        console.error("Error initializing Sentry:", error);
        setIsSentryInitialized(true);
      }
    };

    initializeSentry();
  }, [showErrorModal]);

  if (!isSentryInitialized) {
    return <LoadingIndicator />;
  }

  if (showAuthModal) {
    console.log("Showing auth modal");
    return <AuthModal />;
  }

  const ChildComponent = () => <>{children}</>;
  const WrappedComponent = USE_SENTRY
    ? Sentry.withErrorBoundary(ChildComponent, {
      fallback: <LoadingIndicator />,
    })
    : ChildComponent;
  return <WrappedComponent />;
};

export const rootNavigationRef = createNavigationContainerRef<NavigationViews>();

const App = () => {
  const { isOnboarding, isInitializing, showMainApp, uid } = useAuth();
  const containerRef =
    useRef<NavigationContainerRef<NavigationViews>>(null);
  const previousRouteNameRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useTimezoneUpdater();
  useAPNSTokenUpdater();

  useEffect(() => {
    logEvent("open", { lifecycleEvent: "app_launch" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (uid) {
      logEvent("open", { lifecycleEvent: "app_open" }).catch(() => {});
    }
  }, [uid]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        logEvent("open", { lifecycleEvent: "app_open" }).catch(() => {});
      } else if (
        appStateRef.current === "active" &&
        nextState.match(/inactive|background/)
      ) {
        logEvent("close", { lifecycleEvent: "app_close" }).catch(() => {});
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  if (isOnboarding) {
    return <OnboardingNavigator />;
  }

  if (showMainApp) {
    if (isInitializing) {
      return <LoadingIndicator />;
    }

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer
          ref={containerRef}
          onReady={() => {
            rootNavigationRef.current = containerRef.current;
            sentryNavigationIntegration.registerNavigationContainer(containerRef);
            previousRouteNameRef.current =
              containerRef.current?.getCurrentRoute()?.name ?? null;
          }}
          onStateChange={() => {
            const currentRoute = containerRef.current?.getCurrentRoute();
            const currentRouteName = currentRoute?.name ?? null;
            if (previousRouteNameRef.current !== currentRouteName) {
              logEvent("navigation", {
                  from: previousRouteNameRef.current,
                  to: currentRouteName,
                }).catch(() => {});
              previousRouteNameRef.current = currentRouteName;
            }
          }}
        >
          <AppNavigator />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  return <LoadingIndicator />;
};

const WrappedApp = () => (
  <>
    <SentryWrapper>
      <App />
    </SentryWrapper>
    <ErrorModal />
  </>
);

export default WrappedApp;
