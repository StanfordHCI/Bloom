import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import AppText from "../AppText";
import { WeekdayName, WeeklyPlan, Workout } from "../../context/plan/WeeklyPlan";
import { useNavigation, TabActions } from "@react-navigation/native";
import { DateTime } from "luxon";
import Card from "../Card";


interface UpcomingActivityProps {
  currentDay: string;
}

const UpcomingActivity: React.FC<UpcomingActivityProps> = ({ currentDay }) => {
  const { theme } = useTheme();
  const { currentPlan, upcomingPlan, currentWeekIndex } = usePlan();
  const navigation = useNavigation();

  
  let basePlan: WeeklyPlan;
  if (currentWeekIndex === -1) {
    basePlan = upcomingPlan ?? { workoutsByDay: {} } as WeeklyPlan;
  } else {
    basePlan = currentPlan ?? upcomingPlan ?? { workoutsByDay: {} } as WeeklyPlan;
  }

  if (!basePlan || !basePlan.workoutsByDay) {
    return (
      <Card>
        <View style={styles.container}>
          <View style={styles.header}>
            <AppText style={[styles.title, { color: theme.colors.darkGrey }]}>
              Upcoming Activity
            </AppText>
            <SFSymbol
              name="chevron.right.2"
              weight="semibold"
              scale="medium"
              color={theme.colors.darkGrey}
              style={styles.icon}
            />
          </View>
          <View style={styles.contentContainer}>
            <AppText style={[styles.messageText, { color: theme.colors.darkGrey }]}>
              No plan found.
            </AppText>
          </View>
        </View>
      </Card>
    );
  }

  const weekDays: WeekdayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  let currentDayIndex: number
  if (currentWeekIndex === -1) {
    currentDayIndex = 0;
  } else {
    currentDayIndex = weekDays.indexOf(currentDay as WeekdayName);
  }
  console.log("Current day index:", currentDayIndex);

  // Find the next day with at least one workout
  let nextWorkout: Workout | null = null;
  let nextDay: WeekdayName | null = null;

  const now = DateTime.local();

  for (let i = currentDayIndex; i < weekDays.length; i++) {
    const workouts = basePlan.workoutsByDay[weekDays[i]];

    if (workouts) {
      for (const workout of workouts) {
        const workoutStart = DateTime.fromISO(workout.timeStart);
        if (workoutStart > now && workout.isPlanWorkout && !workout.completed) {
          nextWorkout = workout;
          nextDay = weekDays[i];
          break;
        }
      }
    }

    if (nextWorkout) {
      break;
    }
  }

  if (!nextWorkout || !nextDay) {
    return (
      <Card>
        <View style={styles.container}>
          <View style={styles.header}>
            <AppText style={[styles.title, { color: theme.colors.darkGrey }]}>
              Upcoming Activity
            </AppText>
            <SFSymbol
              name="chevron.right.2"
              weight="semibold"
              scale="medium"
              color={theme.colors.darkGrey}
              style={styles.icon}
            />
          </View>
          <View style={styles.contentContainer}>
            <AppText style={[styles.messageText, { color: theme.colors.darkGrey }]}>
              No upcoming activity found.
            </AppText>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => {
        const jumpToAction = TabActions.jumpTo('Plan');
        navigation.dispatch(jumpToAction);
      }}
    >
      <Card>
        <View style={styles.container}>
          <View style={styles.header}>
            <AppText style={[styles.title, { color: theme.colors.darkGrey }]}>
              Next Workout
            </AppText>
            <SFSymbol
              name="chevron.right.2"
              weight="semibold"
              scale="medium"
              color={theme.colors.darkGrey}
              style={styles.icon}
            />
          </View>

          <View style={styles.contentContainer}>
            <AppText style={[styles.timeText, { color: theme.colors.darkGrey }]}>
              {`${nextDay} at ${DateTime.fromISO(nextWorkout.timeStart).toFormat('h:mm a')}`}
            </AppText>

            <AppText style={[styles.durationText, { color: theme.colors.darkGrey }]}>
              {`${nextWorkout.durationMin}min ${nextWorkout.type
                ? nextWorkout.type === "functional strength training" ||
                  nextWorkout.type === "traditional strength training"
                  ? "strength training"
                  : nextWorkout.type === "high intensity interval training"
                    ? "HIIT"
                    : nextWorkout.type
                : ""
              }`}
            </AppText>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 75,
    padding: 0,
    height: 'auto',
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  contentContainer: {
    paddingBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
    flex: 1,
    flexWrap: 'wrap',
  },
  timeText: {
    fontSize: 14,
    flexWrap: 'wrap',
  },
  durationText: {
    fontSize: 14,
    flexWrap: 'wrap',
  },
  icon: {
    width: 16,
    height: 16,
    marginLeft: 8,
    flexShrink: 0,
  },
  messageText: {
    fontSize: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
});

export default UpcomingActivity;
