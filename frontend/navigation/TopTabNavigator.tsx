import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { TodayScreen } from "../screens/Today/TodayScreen";
import JourneyWeekDetails from "../screens/Journey/JourneyWeek";
import InsightsScreen from "../screens/Insights/InsightsScreen";
import AppText from "../components/AppText";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "../context/ThemeContext";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import { RouteProp } from "@react-navigation/native";
import { NavigationViews } from "./AppNavigator";
import React from 'react';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const Tab = createMaterialTopTabNavigator();

interface TopTabNavigatorProps {
  route: RouteProp<NavigationViews, "TopTabs">;
}

export const TopTabNavigator = ({ route }: TopTabNavigatorProps) => {
  const { theme } = useTheme();
  
  const initialRouteName = route.params?.initialRouteName || "Today";

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Tab.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "transparent",
            borderBottomWidth: 0,
            width: "80%",
          },
          tabBarScrollEnabled: true,
          tabBarLabelStyle: {
            color: theme.colors.primary,
            textAlign: "left",
            fontSize: 15,
            fontWeight: "600",
            width: "auto",
            flexShrink: 0,
            flexWrap: "nowrap",
          },
          tabBarIndicatorStyle: {
            backgroundColor: "#2E2E2E",
            height: 2,
          },
          tabBarItemStyle: {
            width: "auto",
            paddingHorizontal: 16,
            alignItems: 'flex-start',
            flexShrink: 0,
          },
          tabBarContentContainerStyle: {
            paddingLeft: 8,
            flexDirection: "row",
            flexWrap: "nowrap", // Prevent wrapping of tabs
          },
          sceneStyle: {
            backgroundColor: "transparent",
          },
        }}
      >
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{
            tabBarLabel: () => (
              <AppText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: "#2E2E2E",
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Today
              </AppText>
            )
          }}
        />
        <Tab.Screen
          name="Plan"
          component={CurrentWeekPlanScreen}
          options={{
            tabBarLabel: () => (
              <AppText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: "#2E2E2E",
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Plan
              </AppText>
            )
          }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            tabBarLabel: () => (
              <AppText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: "#2E2E2E",
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Insights
              </AppText>
            )
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

// wrapper that passes the week parameter to JWD
const CurrentWeekPlanScreen = () => {
  const { currentWeekIndex } = usePlan();
  
  // Always use the current week, defaulting to 1 if not available
  const weekNumber = currentWeekIndex >= 0 ? currentWeekIndex + 1 : 1;
  
  // We're implementing this component as if it were a normal screen
  // that happens to render JourneyWeekDetails
  return <JourneyWeekDetails 
    navigation={{} as NativeStackNavigationProp<NavigationViews, "JourneyWeekDetails">}
    route={{
      params: { week: weekNumber },
      key: `journeyWeek-${weekNumber}`,
      name: 'JourneyWeekDetails'
    } as RouteProp<NavigationViews, "JourneyWeekDetails">}
  />;
};