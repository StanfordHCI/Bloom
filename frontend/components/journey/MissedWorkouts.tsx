import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import WorkoutCard from "../workout/WorkoutCard";
import { Workout } from "../../context/plan/WeeklyPlan";
import AppText from "../AppText";
import Card from "../Card";
import { SFSymbol } from "react-native-sfsymbols";

interface MissedWorkoutsProps {
  missedWorkouts: Workout[];
  onCompleteWorkout: (w: Workout) => void;
  onRescheduleWorkout: (w: Workout) => void;
  onLinkWorkout: (w: Workout) => void;
}

const MissedWorkouts: React.FC<MissedWorkoutsProps> = ({
  missedWorkouts,
  onCompleteWorkout,
  onRescheduleWorkout,
  onLinkWorkout,
}) => {

  if (missedWorkouts.length === 0) {
    return <AppText style={styles.emptyText}>No missed workouts.</AppText>;
  }

  return (
    <View>
      <Card style={styles.infoCard}>
        <View style={styles.infoContent}>
          <SFSymbol 
            name="info.circle.fill" 
            size={18} 
            color="#FF9500"
            style={{ marginLeft: 9, marginTop: 10, marginRight: 18 }}
          />
          <AppText style={styles.infoText}>
            To keep your garden growing, make sure to complete or reschedule any missed workouts before the week ends.
          </AppText>
        </View>
      </Card>
      <ScrollView>
        {missedWorkouts.map((workout) => (
          <WorkoutCard
            key={workout.id.concat(JSON.stringify(workout.healthKitWorkoutData))}
            workout={workout}
            onComplete={() => onCompleteWorkout(workout)}
            onReschedule={() => onRescheduleWorkout(workout)}
            onLinkToPlan={() => onLinkWorkout(workout)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: 'rgb(255, 250, 190)', // Semi-transparent orange
    padding: 10,
    borderRadius: 15,
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

export default MissedWorkouts;
