import React, { useState, useRef } from "react";
import { View, StyleSheet, LayoutAnimation, ScrollView } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import AppText from "./AppText";
import { WeekdayName, Workout } from "../context/plan/WeeklyPlan";
import { useTheme } from "../context/ThemeContext";
import { workoutTypeToSFSymbol } from "../healthkit/workoutTypes";
import { BlurredBackground } from "./BlurredBackground";
import { DateTime } from "luxon";

interface PlanWidgetUIProps {
  planStart: string;
  workoutsByDay: Record<WeekdayName, Workout[]>;
  isCollapsed?: boolean;
  isPlanWidgetMessage?: boolean;
  currentWeek?: number;
}

const PlanWidgetUI: React.FC<PlanWidgetUIProps> = ({
  workoutsByDay,
  planStart,
  isCollapsed = false,
  isPlanWidgetMessage = false,
}) => {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const scrollViewRef = useRef<ScrollView>(null);

  const formatTime = (workout: Workout) => {
    const date = new Date(workout.timeStart);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes}${ampm}`;
  };
  const daysOfWeek: WeekdayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(!collapsed);
  };

  // Check if any day has multiple workouts
  const hasMultipleWorkouts = Object.values(workoutsByDay).some(
    workouts => workouts.length > 1
  );

  // Calculate week range from Sunday to Saturday
  const getDateRange = () => {
    const sunday = DateTime.fromISO(planStart);
    const saturday = sunday.plus({ days: 6 });

    const formatDate = (dt: DateTime) =>
      dt.toLocaleString({ month: "short", day: "numeric" });

    return `${formatDate(sunday)} - ${formatDate(saturday)}`;
  };

  const dateRange = getDateRange();

  // Get date for each day of the week
  const getDayDates = () => {
    const sunday = DateTime.fromISO(planStart);

    return daysOfWeek.map((_, index) => {
      const date = sunday.plus({ days: index });
      return date.day;
    });
  };

  const dayDates = getDayDates();

  return (
    <>
      <View style={[
        styles.outerContainer,
        isPlanWidgetMessage && { backgroundColor: 'rgba(255, 255, 255, 0.5)' }
      ]}>
        <View style={styles.contentContainer}>
          <BlurredBackground />
          <View style={styles.headerContainer}>
            <View style={styles.dateRangeContainer}>
              <AppText style={{ color: theme.colors.darkGrey, fontWeight: "bold" }}>
                {dateRange}
              </AppText>
            </View>
          </View>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            bounces={false}
            alwaysBounceHorizontal={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            scrollToOverflowEnabled={true}
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.container}>
              {daysOfWeek.map((day, index) => {
                const planWorkouts = (workoutsByDay[day] || []).filter(
                  workout => !workout.isHKWorkout
                );
                const thisDayDt = DateTime.fromISO(planStart).plus({ days: index });
                const isToday = thisDayDt.hasSame(DateTime.now(), "day");

                const workouts = [...planWorkouts].sort(
                  (a, b) =>
                    new Date(a.timeStart).getTime() - new Date(b.timeStart).getTime()
                );

                const displayWorkouts = collapsed ? workouts.slice(0, 1) : workouts;
                const hasWorkout = workouts.length > 0;

                return (
                  <View
                    key={day}
                    style={[
                      styles.dayContainer,
                      isToday && {
                        backgroundColor:
                          theme.colors.chatMessageUserBackground + "20",
                        borderRadius: 8,
                        paddingBottom: 0,
                      },
                    ]}
                  >
                    <View style={styles.dayLabelContainer}>
                      <AppText
                        style={[
                          styles.dateText,
                          {
                            color: isToday
                              ? theme.colors.primary
                              : theme.colors.textDisabled,
                          },
                        ]}
                      >
                        {dayDates[index]}
                      </AppText>
                      <AppText
                        style={[
                          styles.dayText,
                          {
                            color: isToday
                              ? theme.colors.primary
                              : theme.colors.textDisabled,
                          },
                        ]}
                      >
                        {day.slice(0, 3)}
                      </AppText>
                      <View
                        style={[
                          styles.todayDot,
                          {
                            backgroundColor: isToday
                              ? theme.colors.primary
                              : "transparent",
                          },
                        ]}
                      />
                    </View>

                    {/* Workouts Container */}
                    <View style={styles.workoutsContainer}>
                      {hasWorkout ? (
                        displayWorkouts.map((workout, index) => (
                          <View
                            key={index}
                            style={styles.workoutItem}
                          >
                            <View style={styles.workoutIconContainer}>
                              <SFSymbol
                                name={workoutTypeToSFSymbol(workout.type)}
                                weight="medium"
                                scale="small"
                                color={(workout.completed || workout.healthKitWorkoutData) ?
                                  theme.colors.primary : theme.colors.textDisabled}
                                style={[styles.icon, { width: 60 * 0.3, height: 60 * 0.4 }]}
                              />
                              {(workout.completed || workout.healthKitWorkoutData) && (
                                <View style={styles.statusIconContainer}>
                                  <SFSymbol
                                    name="checkmark"
                                    weight="bold"
                                    scale="small"
                                    color={theme.colors.primary}
                                    style={styles.statusIcon}
                                  />
                                </View>
                              )}
                            </View>
                            <AppText
                              style={[
                                styles.timeText,
                                {
                                  color: (workout.completed || workout.healthKitWorkoutData) ?
                                    theme.colors.primary : theme.colors.textDisabled
                                },
                              ]}
                            >
                              {formatTime(workout)}
                            </AppText>
                          </View>
                        ))
                      ) : (
                        <View style={styles.workoutItem}>
                          <View style={styles.emptyDay} />
                        </View>
                      )}
                    </View>

                    {hasWorkout && collapsed && workouts.length > 1 && (
                      <View style={styles.moreWorkoutsIndicator}>
                        <AppText
                          style={[
                            styles.moreWorkoutsText,
                            {
                              color: isToday
                                ? theme.colors.primary
                                : theme.colors.textDisabled,
                            },
                          ]}
                        >
                          +{workouts.length - 1}
                        </AppText>
                        <SFSymbol
                          name="chevron.down"
                          weight="medium"
                          scale="small"
                          color={
                            isToday ? theme.colors.primary : theme.colors.textDisabled
                          }
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
          {!isPlanWidgetMessage && hasMultipleWorkouts && (
            <View
              style={[
                styles.toggleContainer,
                { borderTopColor: theme.colors.inactiveLight },
              ]}
            >
              <AppText
                onPress={toggleCollapse}
                style={[styles.toggleText, { color: theme.colors.primary }]}
              >
                {collapsed ? "Show all workouts" : "Show less"}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    overflow: "hidden",
    elevation: 1,
    marginVertical: 4,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 2,
  },
  scrollContainer: {
    flexGrow: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 0,
    gap: 12,
  },
  dayContainer: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 4,
    minWidth: 30,
    flexGrow: 1
  },
  dayLabelContainer: {
    alignItems: "center",
    gap: 2,
  },
  dateText: {
    fontSize: 13,
    fontFamily: "HankenGrotesk-Medium",
  },
  dayText: {
    fontSize: 13,
    fontFamily: "HankenGrotesk-Medium",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  workoutsContainer: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "transparent",
  },
  workoutItem: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    width: "auto",
  },
  icon: {
    width: 16,
    height: 16,
  },
  timeText: {
    fontSize: 10,
    fontFamily: "HankenGrotesk-Regular",
    textAlign: "center",
    flexShrink: 0,
  },
  emptyDay: {
    height: 2,
    width: 16,
    borderRadius: 1,
    marginTop: 20,
  },
  toggleContainer: {
    alignItems: "center",
    paddingVertical: 4,
    borderTopWidth: 1,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: "HankenGrotesk-Medium",
  },
  moreWorkoutsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  moreWorkoutsText: {
    fontSize: 10,
    fontFamily: "HankenGrotesk-Regular",
  },
  dateRangeContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'relative',
  },
  modifyButton: {
    padding: 8,
    position: 'absolute',
    right: 16,
    height: 35,
    width: 'auto',
    borderRadius: 40,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  workoutIconContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  statusIconContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  statusIcon: {
    width: 8,
    height: 8,
  },
});

export default PlanWidgetUI;
