import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import AppText from "../AppText";
import { useTheme } from "../../context/ThemeContext";
import { SFSymbol } from "react-native-sfsymbols";
import { workoutTypeToSFSymbol, shortenWorkoutType } from "../../healthkit/workoutTypes";
import { Workout } from "../../context/plan/WeeklyPlan";
import WorkoutCardButtons from "./WorkoutCardButtons";
import Card from "../Card";
import { DateTime } from "luxon";

interface WorkoutCardProps {
  workout: Workout;
  onComplete?: () => void;
  onReschedule?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onLinkToPlan: (workout: Workout) => void;
  noOuterCard?: boolean;
}

function getWeekdayName(dateString: string): string {
  const date = new Date(dateString);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[date.getDay()];
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  onComplete,
  onReschedule,
  onDismiss,
  onLinkToPlan,
  noOuterCard,
}) => {
  const { theme } = useTheme();

  const formattedDateTime = () => {
    const dt = DateTime.fromISO(workout.timeStart);
    const day = dt.toFormat('ccc'); // Gets 3-letter day abbreviation
    const time = dt.toFormat('h:mm a'); // Gets time in 12-hour format
    return `${day} @ ${time}`;
  };

  const iconColor = workout.completed ? theme.colors.primary : theme.colors.inactiveDark;

  const cardContent = (
    <>
      <View style={styles.contentContainer}>
        {onDismiss && workout.completed && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => onDismiss(workout.id)}
          >
            <View style={styles.buttonContent}>
              <AppText style={[styles.buttonText, { color: theme.colors.inactiveDark }]}>
                Hide
              </AppText>
              <SFSymbol
                name="xmark"
                color={theme.colors.inactiveDark}
                style={styles.xIcon}
              />
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.workoutInfo}>
          <View style={styles.titleRow}>
            <AppText style={[styles.title, { color: "#333333" }]}>
              {shortenWorkoutType(workout.type)}
            </AppText>
            <AppText
              style={[
                styles.planBonusTag, 
                workout.isHKWorkout ? { backgroundColor: "#D7F8FF" } : { backgroundColor: "#A5EAA4" },
                { color: theme.colors.primary }
              ]}
            >
              {workout.isHKWorkout ? "Bonus" : "Plan"}
            </AppText>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.leftDetailsContainer}>
              <View style={[styles.iconCircle, workout.completed ? { backgroundColor: theme.colors.tertiary } : { backgroundColor: theme.colors.inactiveLight }]}>
                <SFSymbol
                  name={workoutTypeToSFSymbol(workout.type)}
                  weight="semibold"
                  scale="medium"
                  color={iconColor}
                  style={styles.icon}
                />
              </View>

              <View style={styles.workoutDetails}>
                <View style={styles.timeRow}>
                  <SFSymbol
                    name="clock.fill"
                    scale="small"
                    color={"#676767"}
                    style={styles.smallIcon}
                  />
                  <AppText style={[styles.timeText, { color: "#676767" }]}>
                    {`${Math.round(workout.durationMin)}min`}
                  </AppText>
                </View>

                <View style={styles.timeRow}>
                  <SFSymbol
                    name="calendar"
                    scale="small"
                    color={"#676767"}
                    style={styles.smallIcon}
                  />
                  <AppText style={[styles.timeText, { color: "#676767" }]}>
                    {formattedDateTime()}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.rightContainer}>
              <WorkoutCardButtons
                completed={workout.completed}
                onEdit={onReschedule ? () => onReschedule(workout.id) : undefined}
                onComplete={(!workout.completed && !workout.healthKitWorkoutData && onComplete) ?
                  () => onComplete() :
                  undefined}
                hideCompleteButton={
                  workout.completed ||
                  workout.healthKitWorkoutData !== undefined ||
                  DateTime.fromISO(workout.timeStart) > DateTime.now().endOf('day')
                }
                onLinKToPlan={() => void onLinkToPlan(workout)}
                isHKWorkout={workout.isHKWorkout}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Render a row for each HealthKit workout data */}
      {workout.healthKitWorkoutData && workout.healthKitWorkoutData.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {workout.healthKitWorkoutData.map((hk) => {
            const hkDate = DateTime.fromISO(hk.timeStart);
            const baseDate = DateTime.fromISO(workout.timeStart);
            const showWeekday = hkDate.toISODate() !== baseDate.toISODate();
            return (
              <View key={hk.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <SFSymbol
                  name="applewatch"
                  weight="regular"
                  color={theme.colors.primary}
                  style={{ marginRight: 4, width: 16, height: 16 }}
                />
                <AppText style={{ color: theme.colors.primary, fontSize: 14 }}>{`${Math.round(hk.durationMin)}min`}</AppText>
                <AppText style={{ marginLeft: 4, color: theme.colors.primary, fontSize: 14 }}>
                  {shortenWorkoutType(hk.workoutType)}
                </AppText>
                <AppText style={{ marginLeft: 4, color: theme.colors.primary, fontSize: 14 }}>
                  {`at ${hkDate.toFormat('h:mm a')}`}
                </AppText>
                {showWeekday && (
                  <AppText style={{ marginLeft: 4, color: theme.colors.primary, fontSize: 14 }}>
                    {`on ${getWeekdayName(hk.timeStart)}`}
                  </AppText>
                )}
                {hk.source && (
                  <AppText style={{ marginLeft: 4, color: theme.colors.primary, fontSize: 14 }}>
                    {`(${hk.source})`}
                  </AppText>
                )}
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  if (noOuterCard) {
    return (
      <View style={{ marginVertical: 4, position: 'relative' }}>
        {cardContent}
      </View>
    );
  }

  return (
    <Card>
      {cardContent}
    </Card>
  );
};

export default WorkoutCard;

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workoutInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  leftDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 200,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutDetails: {
    justifyContent: 'center',
  },
  icon: {
    width: 30,
    height: 30,
    marginHorizontal: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: '90%',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  smallIcon: {
    width: 20,
    height: 20,
    marginRight: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    fontSize: 14,
  },
  statusText: {
    color: '#2E7D32',
    fontSize: 14,
  },
  timeText: {
    color: '#333',
  },
  rightContainer: {
    width: 'auto',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 12,
    marginLeft: 'auto',
  },
  autoDetectedContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dismissButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    padding: 4,
  },
  dismissIcon: {
    width: 24,
    height: 24,
  },
  xIcon: {
    width: 14,
    height: 14,
  },
  planBonusTag: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
