import React from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { OnboardingStep, useOnboarding } from "../context/OnboardingContext";
import StudyCode from "./StudyCode";
import Motivation from "./Motivation";
import Welcome from "./Welcome";
import OnboardingSignUp from "./OnboardingSignUp";
import OnboardingSignIn from "./OnboardingSignIn";
import Avatar from "./Avatar";
import PastExperience from "./PastExperience";
import Barriers from "./Barriers";
import FitnessPlanIntro from "./FitnessPlanIntro";
import HealthKitPermissions from "./HealthKitPermissions";
import NotificationPermissions from "./NotificationPermissions";
import ChatIntro from "./ChatIntro";
import OnboardingChat from "./OnboardingChat";
import PlanCreation from "./PlanCreation";
import ScheduleCheckIn from "../checkin/ScheduleCheckIn";
import OnboardingDebugButtons from "./OnboardingDebugButtons";
import PrivacyDisclaimers from "./PrivacyDisclaimers";
import PrivacyDisclaimersControl from "./PrivacyDisclaimersControl";
import HealthDisclaimers from "./HealthDisclaimers";
import GoalSetting from "./GoalSetting";
import PlanIntro from "./PlanIntro";
import HelloGarden from "./HelloGarden";
import WelcomeToBloom from "./WelcomeToBloom";
import AvatarQuestions from "./AvatarQuestions";
import AdviceResources from "./AdviceResources";
import { onboardingNavigationRef } from "../../index";
import HelloGarden2 from "./HelloGarden2";
import AppText from "../components/AppText";
import { useTheme } from "../context/ThemeContext";
import { SFSymbol } from "react-native-sfsymbols";

const Stack = createStackNavigator();

const BackButton: React.FC = () => {
  const { currentStep, previousStepFrom } = useOnboarding();
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => void previousStepFrom(currentStep as OnboardingStep)}
      style={{ marginLeft: 15 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <SFSymbol name="chevron.backward" size={16} color={theme.colors.text} style={{ marginLeft: 2, marginRight: 8 }} />
        <AppText style={{ fontSize: 18, color: theme.colors.text }}>Back</AppText>
      </View>
    </TouchableOpacity>
  );
};

const OnboardingNavigator: React.FC = () => {
  const { currentStep, nextStepFrom, resetOnboarding, isAdvancing } = useOnboarding();
  const { completeOnboarding } = useAuth();
  if (currentStep === null || currentStep === "Finished" || isAdvancing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'white' }}>
        <ActivityIndicator size="large" style={{ flex: 1, justifyContent: "center" }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <OnboardingDebugButtons
        resetOnboarding={() => void resetOnboarding()}
        skipOnboarding={completeOnboarding}
        completeOnboarding={completeOnboarding}
        navigationRef={onboardingNavigationRef}
      />

      <NavigationContainer
        ref={onboardingNavigationRef}
      >
        <Stack.Navigator
          initialRouteName={currentStep}
          screenOptions={{
            headerTitle: "",
            cardStyle: {
              backgroundColor: "transparent"
            },
            gestureEnabled: false,
            headerStyle: {
              backgroundColor: "transparent",
            },
            headerTransparent: true,
            headerLeft: () => <BackButton />,
          }}
        >
          <Stack.Screen name="StudyCode" component={StudyCode} options={{ headerShown: false }} />
          <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
          <Stack.Screen name="AdviceResources" component={AdviceResources} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="SignUp" component={OnboardingSignUp} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="SignIn" component={OnboardingSignIn} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="PastExperience" component={PastExperience} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="Barriers" component={Barriers} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="Motivation" component={Motivation} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="WelcomeToBloom" component={WelcomeToBloom} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="HelloGarden" component={HelloGarden} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="HelloGarden2" component={HelloGarden2} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="FitnessPlanIntro" component={FitnessPlanIntro} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="PrivacyDisclaimers" component={PrivacyDisclaimers} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="PrivacyDisclaimersControl" component={PrivacyDisclaimersControl} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="HealthDisclaimers" component={HealthDisclaimers} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="HealthKitPermissions" component={HealthKitPermissions} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="NotificationPermissions" component={NotificationPermissions} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="Avatar" component={Avatar} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="AvatarQuestions" component={AvatarQuestions} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="GoalSetting" component={GoalSetting} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="PlanIntro" component={PlanIntro} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="PlanCreation" component={PlanCreation} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="ChatIntro" component={ChatIntro} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="OnboardingChat" component={OnboardingChat} options={{ headerBackTitle: "Back", animation: "none" }} />
          <Stack.Screen name="ScheduleCheckIn" options={{ headerBackTitle: "Back", animation: "none" }} >
            {(props) => (
              <ScheduleCheckIn
                {...props}
                onNext={() => {
                  void nextStepFrom("ScheduleCheckIn");
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </View >
  );
};

export default OnboardingNavigator;
