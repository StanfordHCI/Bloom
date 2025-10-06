import React from "react";
import { View, StyleSheet, Image, ScrollView, Alert } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useCheckIn } from "../context/CheckInContext";
import beeIcon from '../assets/images/Bee.png';
import AppText from "../components/AppText";
import OnboardingButton from '../components/onboarding/OnboardingButton';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTime } from 'luxon';

const CheckInWelcome: React.FC = () => {
  const { theme } = useTheme();
  const { nextStepFrom, navigateToStep } = useCheckIn();
  const insets = useSafeAreaInsets();
  const {
    plansByWeek,
    currentWeekIndex,
    currentPlan,
    checkInState,
    upcomingPlan
  } = usePlan();

  const handleStartCheckIn = async () => {
    try {
      const now = DateTime.local();
      const dayOfWeek = now.weekday % 7; // 0=Sun, 1=Mon,... 6=Sat
      const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;

      if (upcomingPlan) {
        Alert.alert(
          "Already Checked In",
          "You already have a plan for next week. Come back on Friday or Saturday of next week to review your progress and complete your check-in. If you believe this was an error, please contact the research staff."
        )
        return;
      }
      if (!isFriSat && currentPlan) {
        Alert.alert(
          "It's Too Early to Check In",
          "You have an active plan for this week. Come back on Friday or Saturday to review your progress and complete your check-in. If you believe this was an error, please contact the research staff."
        )
        return;
      }

      let planToReview;
      if (isFriSat && currentPlan) {
        planToReview = currentPlan
      } else {
        planToReview = plansByWeek[currentWeekIndex - 1] ?? null;
      }

      const hasMissedWorkouts = planToReview?.workoutsByDay ?
        Object.values(planToReview.workoutsByDay)
          .flat()
          .some(workout => {
            const workoutTime = DateTime.fromISO(workout.timeStart);
            return (workoutTime < now) && !workout.completed;
          })
        : false;

      await AsyncStorage.setItem("previousPlanHadMissedWorkouts", hasMissedWorkouts.toString());
      await nextStepFrom("CheckInWelcome");
    } catch (error) {
      console.error('Error in handleStartCheckIn:', error);
    }
  };

  return (
    <View style={{
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      backgroundColor: 'white',
      flex: 1,
    }}>
      <View style={[theme.onboarding.container]}>
        <ScrollView style={styles.scrollContent}>
          <View style={theme.onboarding.topSection}>
            <AppText variant="h1">Weekly Check-In</AppText>
          </View>

          <View style={theme.onboarding.middleSection}>
            <Image
              source={beeIcon}
              style={styles.logo}
              resizeMode="contain"
            />
            <AppText style={{ marginTop: 20, fontWeight: 'bold' }}>
              This conversation will take about 15-20 minutes. If you don't have time right now, you can reschedule for later.
            </AppText>
            <AppText style={{ marginTop: 20 }}>
              We'll have a conversation to see what worked last week, what didn't, and create a new physical activity plan for the upcoming week.
            </AppText>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingButton
            label="Start Check-In"
            onPress={() => void handleStartCheckIn()}
            variant="primary"
          />

          {checkInState !== 'missed' && checkInState !== "error-missing" && (
            <OnboardingButton
              label="Reschedule"
              onPress={() => void navigateToStep("RescheduleCheckIn")}
              variant="secondary"
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default CheckInWelcome;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  chevronContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    opacity: 0.5,
  },
  footer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    marginTop: 10,
    borderTopColor: '#F0F0F0',
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    zIndex: 1,
    padding: 8,
  },
  dismissBar: {
    width: 36,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 2.5,
  },
});
