import React from "react";
import { View, StyleSheet } from "react-native";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import AppText from "../components/AppText";
import PlanWidgetUI from "../components/PlanWidgetUI";
import CheckInHeaderFooter from '../components/checkin/CheckInHeaderFooter';

const CheckInNewGoal: React.FC = () => {
  const { currentPlan, plansByWeek, currentWeekIndex } = usePlan();

  // Determine which plan to show based on the day of the week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  // For Sunday-Thursday, show previous week's plan
  // For Friday-Saturday, show current week's plan
  const planToShow = dayOfWeek >= 0 && dayOfWeek <= 4 
    ? plansByWeek[currentWeekIndex - 1] // Sunday-Thursday: show previous week
    : currentPlan; // Friday-Saturday: show current week

  return (
    <CheckInHeaderFooter
      title="Set New Goals"
      nextStep="CheckInNewGoal"
      buttonLabel="Create Plan"
    >
      <AppText style={styles.message}>
        It's now time to create next week's plan! Add the workouts you'd like to complete, reflecting on how last week's plan went.
      </AppText>

      {planToShow && (
        <View style={styles.planWidget}>
          <PlanWidgetUI
            planStart={planToShow.start}
            workoutsByDay={planToShow.workoutsByDay}
          />
        </View>
      )}
    </CheckInHeaderFooter>
  );
};

const styles = StyleSheet.create({
  message: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'HankenGrotesk-Regular',
    marginBottom: 24,
  },
  planWidget: {
    marginTop: 20,
  },
});

export default CheckInNewGoal;
