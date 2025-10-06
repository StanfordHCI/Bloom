import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import WorkoutCard from "../workout/WorkoutCard";
import { Workout } from "../../context/plan/WeeklyPlan";
import AppText from "../AppText";

interface UpcomingWorkoutsProps {
  upcomingWorkouts: Workout[];
  forceExpand?: boolean;
  onCompleteWorkout: (w: Workout) => void;
  onRescheduleWorkout: (w: Workout) => void;
  onLinkWorkout: (w: Workout) => void;
}

const UpcomingWorkouts: React.FC<UpcomingWorkoutsProps> = ({
  upcomingWorkouts,
  onCompleteWorkout,
  onRescheduleWorkout,
  onLinkWorkout,
}) => {

  console.log("UpcomingWorkouts", upcomingWorkouts.length);
  
  if (upcomingWorkouts.length === 0) {
    return <AppText style={styles.emptyText}>No upcoming workouts.</AppText>;
  }

  return (
    <ScrollView>
      {upcomingWorkouts.map((workout) => (
        <WorkoutCard
          key={workout.id.concat(JSON.stringify(workout.healthKitWorkoutData))}
          workout={workout}
          onComplete={() => onCompleteWorkout(workout)}
          onReschedule={() => onRescheduleWorkout(workout)}
          onLinkToPlan={() => onLinkWorkout(workout)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)', // Semi-transparent orange
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
    lineHeight: 20,
    color: 'theme.colors.primary',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    padding: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default UpcomingWorkouts;
