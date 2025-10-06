import React, { useState } from "react";
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useCheckIn } from "../context/CheckInContext";
import AppText from "../components/AppText";
import PlanWidgetUI from "../components/PlanWidgetUI";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import { Workout } from "../context/plan/WeeklyPlan";
import { firestore } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { STUDY_ID } from "../config";
import { useAuth } from "../context/AuthContext";
import CheckInHeaderFooter from '../components/checkin/CheckInHeaderFooter';

const CheckInCompareGoal: React.FC = () => {
  const { nextStepFrom } = useCheckIn();
  const { currentPlan } = usePlan();
  const { uid } = useAuth();
  const [goalFitResponse, setGoalFitResponse] = useState('');
  const [barriersResponse, setBarriersResponse] = useState('');
  const [improvementResponse, setImprovementResponse] = useState('');

  // Calculate if goal was reached by checking completed workouts
  const calculateGoalProgress = () => {
    if (!currentPlan) return false;

    const allWorkouts: Workout[] = Object.values(currentPlan.workoutsByDay)
      .flat()
      .filter(workout => !workout.dismissed);

    const totalPlannedWorkouts = allWorkouts.length;
    const completedWorkouts = allWorkouts.filter(workout => workout.completed).length;

    return totalPlannedWorkouts > 0 && completedWorkouts === totalPlannedWorkouts;
  };

  const goalReached = calculateGoalProgress();

  const handleNext = async () => {
    if (!uid) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const checkInRef = doc(firestore, 'studies', STUDY_ID, 'users', uid, 'check-ins', today);

      await setDoc(checkInRef, {
        goalComparison: {
          goalReached,
          responses: {
            goalFit: goalFitResponse,
            barriers: barriersResponse,
            improvements: improvementResponse,
          },
          timestamp: new Date().toISOString(),
        }
      }, { merge: true });

      console.log('Stored goal comparison responses in Firebase');
      void nextStepFrom("CheckInCompareGoal");
    } catch (error) {
      console.error("Error updating goal comparison data:", error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <CheckInHeaderFooter
          title="Goal Review"
          nextStep="CheckInCompareGoal"
          onBeforeNext={handleNext}
          buttonLabel="Set New Goals"
          disabled={!goalFitResponse || !barriersResponse || !improvementResponse}
        >
            <View style={styles.messageContainer}>
              <AppText style={styles.question}>
                Do you think your previous goal worked well for you?
              </AppText>
              <TextInput
                style={styles.input}
                value={goalFitResponse}
                onChangeText={setGoalFitResponse}
                multiline
                textAlignVertical="top"
                placeholder="Enter your response..."
              />

              <AppText style={styles.question}>
                What barriers or obstacles did you encounter?
              </AppText>
              <TextInput
                style={styles.input}
                value={barriersResponse}
                onChangeText={setBarriersResponse}
                multiline
                textAlignVertical="top"
                placeholder="Enter your response..."
              />

              <AppText style={styles.question}>
                What do you think you can do to hit your goal next time?
              </AppText>
              <TextInput
                style={styles.input}
                value={improvementResponse}
                onChangeText={setImprovementResponse}
                multiline
                textAlignVertical="top"
                placeholder="Enter your response..."
              />
            </View>

          {currentPlan && (
            <View style={styles.planWidget}>
              <PlanWidgetUI
                planStart={currentPlan.start}
                workoutsByDay={currentPlan.workoutsByDay}
              />
            </View>
          )}
        </CheckInHeaderFooter>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    gap: 20,
  },
  successMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'HankenGrotesk-Bold',
    textAlign: 'left',
    lineHeight: 24,
  },
  question: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'HankenGrotesk-Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontFamily: 'HankenGrotesk-Regular',
    fontSize: 16,
    marginTop: 8,
  },
  planWidget: {
    marginTop: 20,
  },
});

export default CheckInCompareGoal;
