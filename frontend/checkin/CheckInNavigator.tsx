import React, { useEffect } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack";
import { NavigationContainer, createNavigationContainerRef, NavigationIndependentTree } from "@react-navigation/native";
import CheckInWelcome from "./CheckInWelcome";
import CheckInChat from "./CheckInChat";
import CheckInHealth from "./CheckinHealth";
import CheckInCompareGoal from "./CheckinCompareGoal";
import CheckInNewGoal from "./CheckinNewGoal";
import PlanCreation from "./PlanCreation";
import ScheduleCheckIn from "./ScheduleCheckIn";
import RescheduleCheckIn from "./RescheduleCheckIn";
import { CheckInProvider, useCheckIn, CheckInStep } from "../context/CheckInContext";
import CheckInDebugButtons from './CheckInDebugButtons';
import { useTheme } from "../context/ThemeContext";
import AppText from "../components/AppText";
import { SFSymbol } from "react-native-sfsymbols";
import CheckInMissedWorkouts from "./CheckInMissedWorkouts";
import CheckInAmbientProgress from "./CheckInAmbientProgress";
import { NavigationViews } from "../navigation/AppNavigator";

const Stack = createStackNavigator();
const navigationRef = createNavigationContainerRef<CheckInStep>();

type CheckInNavigatorProps = StackScreenProps<NavigationViews, "CheckInFlow"> & {
  onExit: () => void;
};


const CheckInNavigator: React.FC<CheckInNavigatorProps> = ({ onExit, route }) => {
  useEffect(() => {
    console.log("Checkin route", route.params)
    const desiredScreen = route.params?.screen;
    if (desiredScreen) {
      setTimeout(() => navigationRef.navigate(desiredScreen), 100);
    }
  }, [route.params]);

  return (
    <CheckInProvider
      navigation={navigationRef}
      onExit={onExit}
    >
      <CheckIn />
    </CheckInProvider>
  );
};

const BackButton: React.FC = () => {
  const { currentStep, previousStepFrom } = useCheckIn();
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => void previousStepFrom(currentStep as CheckInStep)}
      style={{ marginLeft: 15 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
      <SFSymbol name="chevron.backward" size={16} color={theme.colors.text} style={{ marginLeft: 2, marginRight: 8 }} />
      <AppText style={{ fontSize: 18, color: theme.colors.text }}>Back</AppText>
      </View>
    </TouchableOpacity>
  );
};

const CheckIn: React.FC = () => {
  const { nextStepFrom, currentStep } = useCheckIn();
  console.log(currentStep)
  if (currentStep === null) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: "center" }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationIndependentTree>
        <NavigationContainer ref={navigationRef}>
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
            <Stack.Screen name="CheckInWelcome" component={CheckInWelcome} options={{ headerBackTitle: "Back", animation: "none" }} />
            <Stack.Screen name="CheckInHealth" component={CheckInHealth} options={{ headerBackTitle: "Back", animation: "none" }} />
            <Stack.Screen name="CheckInCompareGoal" component={CheckInCompareGoal} options={{ headerBackTitle: "Back", animation: "none" }} />
            <Stack.Screen name="CheckInNewGoal" component={CheckInNewGoal} options={{ headerBackTitle: "Back", animation: "none" }} />
            <Stack.Screen name="PlanCreation" component={PlanCreation} options={{ headerBackTitle: "Back", animation: "none" }} />
            <Stack.Screen name="CheckInChat" component={CheckInChat} options={{ headerBackTitle: "Back", animation: "none" }} />
            <Stack.Screen name="ScheduleCheckIn">
              {(props) => (
                <ScheduleCheckIn
                  {...props}
                  onNext={() => {
                    void nextStepFrom("ScheduleCheckIn");
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="RescheduleCheckIn" component={RescheduleCheckIn} />
            <Stack.Screen name="CheckInMissedWorkouts" component={CheckInMissedWorkouts} options={{ headerBackTitle: "Back", animation: "none" }} />
            <Stack.Screen name="CheckInAmbientProgress" component={CheckInAmbientProgress} options={{ headerBackTitle: "Back", animation: "none" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
      <CheckInDebugButtons navigationRef={navigationRef} />
    </View>
  );
};

export default CheckInNavigator;
