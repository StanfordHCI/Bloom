import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Image } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useCheckIn } from "../context/CheckInContext";
import AppText from "../components/AppText";
import { Workout } from "../context/plan/WeeklyPlan";
import Card from "../components/Card";
import { SFSymbol } from "react-native-sfsymbols";
import { DateTime } from "luxon";
import { Switch } from "react-native";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import { workoutTypeToSFSymbol, shortenWorkoutType } from "../healthkit/workoutTypes";
import BeeImage from "../assets/images/Bee.png";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setCompletion } from "../context/plan/modifyPlanUtils";
import CheckInHeaderFooter from '../components/checkin/CheckInHeaderFooter';

const CheckInMissedWorkouts: React.FC = () => {
  const { theme } = useTheme();
  const { nextStepFrom } = useCheckIn();
  const {
    currentPlan,
    updatePlan,
    plansByWeek,
    currentWeekIndex,
  } = usePlan();
  const [localCompletionState, setLocalCompletionState] = useState<Record<string, boolean>>({});

  const planToReview = useMemo(() => {
    const now = DateTime.local();
    const dayOfWeek = now.weekday % 7; // 0=Sun, 1=Mon,... 6=Sat
    const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;
    // If it's Fri/Sat and there's a currentPlan, use that. Otherwise, show previous week's plan.
    if (isFriSat && currentPlan) {
      return currentPlan;
    } else {
      return plansByWeek[currentWeekIndex - 1] ?? null;
    }
  }, [currentPlan, plansByWeek, currentWeekIndex]);

  // Check if we should skip this screen
  useEffect(() => {
    const checkAndSkip = async () => {
      if (!planToReview?.workoutsByDay) return;

      const allWorkouts = Object.values(planToReview.workoutsByDay).flat();
      const allCompleted = allWorkouts.every(w => w.completed);

      if (allCompleted) {
        // Store that there were no missed workouts
        await AsyncStorage.setItem('previousPlanHadMissedWorkouts', 'false');
        // Skip to ambient progress
        void nextStepFrom('CheckInMissedWorkouts');
      } else {
        await AsyncStorage.setItem('previousPlanHadMissedWorkouts', 'true');
      }
    };

    void checkAndSkip();
  }, [planToReview]);

  // Get workouts status directly in component
  const workoutStatus = useMemo(() => {
    if (!planToReview?.workoutsByDay) {
      console.error('CheckInMissedWorkouts: planToReview missing workoutsByDay');
      return { missed: [], upcoming: [], completed: 0, total: 0 };
    }

    const now = DateTime.local();
    const dayOfWeek = now.weekday % 7;
    const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;

    const allWorkouts = Object.values(planToReview.workoutsByDay).flat();

    const status = allWorkouts.reduce((acc, workout) => {
      acc.total++;

      if (workout.completed) {
        acc.completed++;
      } else {
        const workoutTime = DateTime.fromISO(workout.timeStart);
        const finishTime = workoutTime.plus({ minutes: workout.durationMin });

        // If the workout's end time is in the past, it's missed
        if (finishTime < now) {
          acc.missed.push(workout);
        } else if (isFriSat) {
          acc.upcoming.push(workout);
        }
      }
      return acc;
    }, {
      missed: [] as Workout[],
      upcoming: [] as Workout[],
      completed: 0,
      total: 0
    });

    return status;
  }, [planToReview]);

  const getMessage = () => {
    const { missed, upcoming, completed, total } = workoutStatus;
    const progressPct = Math.round((completed / total) * 100);
    const canReach100 = completed + upcoming.length === total;

    if (upcoming.length > 0) {
      if (canReach100) {
        return `You've completed ${progressPct}% of your workouts. Complete your remaining ${upcoming.length} workout${upcoming.length === 1 ? '' : 's'} to reach 100%!`;
      }
      return `You've completed ${progressPct}% of your workouts. You have ${upcoming.length} workout${upcoming.length === 1 ? '' : 's'} remaining.`;
    }

    if (missed.length > 0) {
      return "These workouts in your plan are still incomplete. If this does not correctly reflect your weekly progress, you can mark them complete here!";
    }

    return "No workouts to review.";
  };

  const handleToggle = (workout: Workout, isComplete: boolean) => {
    setLocalCompletionState(prev => ({
      ...prev,
      [workout.id]: isComplete
    }));
  };

  const handleContinue = async () => {
    if (!planToReview?.id) return;

    // Apply all changes
    let plan = planToReview;
    Object.entries(localCompletionState).map(([workoutId, isComplete]) => {
      plan = setCompletion(plan, workoutId, isComplete);
    });
    await updatePlan(plan, planToReview.id);

    // Immediately update the missed workouts status based on updated completions
    const allWorkouts = Object.values(planToReview.workoutsByDay).flat();
    const updatedMissed = allWorkouts.filter(workout => {
      const isCompleted = Object.prototype.hasOwnProperty.call(localCompletionState, workout.id)
        ? localCompletionState[workout.id]
        : workout.completed;
      return !isCompleted
    });
    await AsyncStorage.setItem('previousPlanHadMissedWorkouts', updatedMissed.length > 0 ? 'true' : 'false');
    void nextStepFrom("CheckInMissedWorkouts");
  };

  if (workoutStatus.missed.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <AppText style={styles.noWorkoutsText}>
          Checking your workout progress...
        </AppText>
      </View>
    );
  }

  const renderWorkoutItem = (workout: Workout) => (
    <Card key={workout.id} style={styles.workoutCard}>
      <View style={styles.workoutRow}>
        <View style={styles.workoutInfo}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.tertiary }]}>
              <SFSymbol
                name={workoutTypeToSFSymbol(workout.type)}
                weight="semibold"
                scale="medium"
                color={theme.colors.primary}
                style={styles.icon}
              />
            </View>
            <View>
              <AppText style={styles.workoutTitle}>
                {shortenWorkoutType(workout.type)}
              </AppText>
              <AppText style={styles.workoutTime}>
                {DateTime.fromISO(workout.timeStart).toFormat('ccc @ h:mm a')}
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.toggleContainer}>
          <AppText style={styles.toggleLabel}>
            {(localCompletionState[workout.id] ?? workout.completed) ? 'Yes' : 'No'}
          </AppText>
          <Switch
            value={localCompletionState[workout.id] ?? workout.completed}
            onValueChange={(value) => handleToggle(workout, value)}
            trackColor={{ false: theme.colors.inactiveDark, true: theme.colors.primary }}
          />
        </View>
      </View>
    </Card>
  );

  return (
    <CheckInHeaderFooter
      title="Your Progress"
      nextStep="CheckInMissedWorkouts"
      onBeforeNext={handleContinue}
    >
      <View style={styles.beeMessageContainer}>
        <View style={styles.beeContainer}>
          <View style={styles.beeCircle}>
            <Image source={BeeImage} style={styles.beeImage} />
          </View>
        </View>
        <View style={[styles.messageContainer, styles.beeMessage]}>
          <AppText style={styles.messageText}>
            {getMessage()}
          </AppText>
        </View>
      </View>

      {workoutStatus.missed.length > 0 && (
        <>
          <AppText style={styles.workoutsTitle}>Did you complete these workouts?</AppText>
          <View style={styles.workoutsList}>
            {workoutStatus.missed.map(renderWorkoutItem)}
          </View>
        </>
      )}

      {workoutStatus.upcoming.length > 0 && (
        <>
          <AppText style={styles.workoutsTitle}>Upcoming Workouts</AppText>
          <View style={styles.workoutsList}>
            {workoutStatus.upcoming.map(workout => (
              <Card key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutRow}>
                  <View style={styles.workoutInfo}>
                    <View style={styles.iconContainer}>
                      <View style={[styles.iconCircle, { backgroundColor: theme.colors.tertiary }]}>
                        <SFSymbol
                          name={workoutTypeToSFSymbol(workout.type)}
                          weight="semibold"
                          scale="medium"
                          color={theme.colors.primary}
                          style={styles.icon}
                        />
                      </View>
                      <View>
                        <AppText style={styles.workoutTitle}>
                          {shortenWorkoutType(workout.type)}
                        </AppText>
                        <AppText style={styles.workoutTime}>
                          {DateTime.fromISO(workout.timeStart).toFormat('ccc @ h:mm a')}
                        </AppText>
                      </View>
                    </View>
                  </View>
                  <AppText style={[styles.upcomingLabel, { color: theme.colors.primary }]}>
                    Upcoming
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        </>
      )}

      {workoutStatus.missed.length === 0 && workoutStatus.upcoming.length === 0 && (
        <AppText style={styles.noWorkoutsText}>
          No workouts to review
        </AppText>
      )}
    </CheckInHeaderFooter>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  workoutsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'HankenGrotesk-Bold',
  },
  messageContainer: {
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 24,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  workoutsList: {
    gap: 12,
  },
  workoutCard: {
    marginBottom: 12,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 30,
    height: 30,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  workoutTime: {
    fontSize: 14,
    color: '#676767',
    marginTop: 4,
  },
  noWorkoutsText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'HankenGrotesk-Bold',
    marginBottom: 8,
  },
  beeMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  beeContainer: {
    marginRight: 8,
    marginBottom: -8,
  },
  beeCircle: {
    width: 36,
    height: 36,
    borderRadius: 36,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#E0E0E0',
  },
  beeImage: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  beeMessage: {
    flex: 1,
    marginBottom: 0,
    marginRight: '8%',
  },
  upcomingLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'HankenGrotesk-Medium',
  },
});

export default CheckInMissedWorkouts;
