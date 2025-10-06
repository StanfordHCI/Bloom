import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../AppText';

interface WorkoutStatsRowProps {
  totalWorkouts: number;
  totalDuration: number; // Total hours
  avgDuration: number; // Average hours
}

const WorkoutStatsRow: React.FC<WorkoutStatsRowProps> = ({
  totalWorkouts,
  totalDuration,
  avgDuration
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View>
          <AppText variant="p" style={styles.label}># WORKOUTS</AppText>
          <AppText variant="p" style={styles.value}>{totalWorkouts}</AppText>
        </View>
        <View>
          <AppText variant="p" style={styles.label}>TOTAL DURATION</AppText>
          <AppText variant="p" style={styles.value}>
            {totalDuration.toFixed(1)} hrs
          </AppText>
        </View>
        <View>
          <AppText variant="p" style={styles.label}>AVG DURATION</AppText>
          <AppText variant="p" style={styles.value}>
            {avgDuration.toFixed(1)} hrs
          </AppText>
        </View>
      </View>
    </View>
  );
};

export default WorkoutStatsRow;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  dateRange: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#999',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
