import React from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/types";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import "react-native-get-random-values";
import { useTheme } from "../../context/ThemeContext";
import WeeklyProgress from "../../components/today/WeeklyProgress";
import UpcomingActivity from "../../components/today/UpcomingActivity";
import TodaysWorkout from "../../components/today/TodaysWorkout";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import { useAuth } from "../../context/AuthContext";
import StaticInputBar from "../../components/chat/StaticInputBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TodayChatMessage from "../../components/today/TodayChatMessage";
import { useHealthKitUpdater } from "../../healthkit/useHealthKitUpdater";

type TodayScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const TodayScreen = () => {
  const { theme } = useTheme();
  const { initialized, currentDay } = usePlan();
  const navigation = useNavigation<TodayScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  // We only track whether the "Log Workout" modal is showing
  const { isControl } = useAuth();

  useHealthKitUpdater();

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, width: "100%" }}>
        <View style={styles.rowContainer}>
          <View style={[styles.componentContainer, { marginRight: 4 }]}>
            <WeeklyProgress />
          </View>
          <View style={[styles.componentContainer, { marginLeft: 4 }]}>
            <UpcomingActivity currentDay={currentDay} />
          </View>
        </View>

        <View style={[styles.fullWidthContainer, { flex: 1 }]}>
          <View style={{ flex: 1 }}>
            <TodaysWorkout day={currentDay} />
          </View>
        </View>
      </View>

      {!isControl && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => navigation.navigate("TodayChatScreen")}
          style={[styles.chatBarContainer, { marginBottom: insets.bottom }]}
        >
          <TodayChatMessage onPress={() => navigation.navigate("TodayChatScreen")} />
          <View pointerEvents="none">
            <StaticInputBar />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  chatBarContainer: {
    width: "100%",
    paddingHorizontal: 8,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginTop: 4,
    paddingHorizontal: 8,
    height: "auto",
    flexWrap: "wrap",
    gap: 0,
  },
  componentContainer: {
    flex: 1,
    minWidth: 150,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
    flexWrap: "wrap",
    gap: 8,
    padding: 4,
  },
  logButton: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 15,
  },
  logButtonText: {
    fontSize: 14,
    fontFamily: "HankenGrotesk-Medium",
  },
  workoutTitle: {
    fontSize: 20,
    fontFamily: "HankenGrotesk-Bold",
    fontWeight: "600",
  },
  fullWidthContainer: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 8,
  },
});
