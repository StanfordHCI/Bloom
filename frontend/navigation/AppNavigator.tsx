import {
  createStackNavigator,
  StackScreenProps,
  StackNavigationProp,
} from "@react-navigation/stack";
import { TopTabNavigator } from "./TopTabNavigator";
import TodayChatScreen from "../screens/Today/TodayChatScreen";
import { useTheme } from "../context/ThemeContext";
import { TouchableOpacity } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import SettingsScreen from "../screens/SettingsScreen";
import CheckInNavigator from "../checkin/CheckInNavigator";
import { useCheckInModalTrigger } from "../checkin/useCheckInModalTrigger";
import { useNotificationListener } from "../notifications/notifications";
import ReadOnlyChatView from "../components/chat/ReadOnlyChatView";
import WeekDetail from "../screens/Journey/JourneyWeek";
import JourneyScreen from "../screens/Journey/JourneyScreen";
import { WeekdayName, WeeklyPlan } from "../context/plan/WeeklyPlan";
import { CheckInStepParamList } from "../context/CheckInContext";
import { NavigatorScreenParams } from "@react-navigation/native";

export type NavigationViews = {
  Settings: undefined;
  TopTabs: { initialRouteName?: string };
  TodayChatScreen: { openHistoryModal?: () => void };
  CheckInFlow: NavigatorScreenParams<CheckInStepParamList> | undefined;
  ChatHistoryScreen: { sessionId: string };
  JourneyWeekDetails: { week: number };
  JourneyScreen: undefined;
  ModifyPlan: {
    week: number;
    daysOfWeek: WeekdayName[];
    currentPlan: WeeklyPlan;
    uid: string;
  };
  Plan: undefined;
};

const Stack = createStackNavigator<NavigationViews>();

export const AppNavigator = () => {
  const { theme } = useTheme();

  useCheckInModalTrigger();
  useNotificationListener();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "transparent", // Transparent background for header
        },
        headerTintColor: theme.colors.text, // Use theme colors for header text/icons
        cardStyle: {
          backgroundColor: "transparent", // Transparent screen background
        },
      }}
    >
      <Stack.Screen
        name="TopTabs"
        component={TopTabNavigator}
        options={({
          navigation,
        }: {
          navigation: StackNavigationProp<NavigationViews>;
        }) => ({
          headerTransparent: true,
          headerShown: true,
          headerTitle: "",
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              style={{ marginRight: 20 }}
            >
              <SFSymbol
                name="gearshape.fill"
                weight="regular"
                scale="large"
                color={"#3B3B3B"} // Use theme color for the icon
                style={{ width: 24, height: 24 }}
              />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="TodayChatScreen"
        component={TodayChatScreen}
        options={{
          headerTitle: "Chat",
          headerBackTitle: "Back",
          animation: "none",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="CheckInFlow"
        options={{
          presentation: "transparentModal",
          headerShown: false,
        }}
      >
        {(props: StackScreenProps<NavigationViews, 'CheckInFlow'>) => (
          <CheckInNavigator
            {...props}
            onExit={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ChatHistoryScreen"
        component={ReadOnlyChatView}
        options={{
          headerTitle: "Past Session",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="JourneyWeekDetails"
        component={WeekDetail}
        options={({ route }) => ({
          headerTitle: `Week ${route.params?.week} Progress`,
          headerBackTitle: "Back",
          animation: "none",
        })}
      />
      <Stack.Screen
        name="JourneyScreen"
        component={JourneyScreen}
        options={{
          headerTitle: "Journey Screen",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
};
