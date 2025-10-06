import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WorkoutChartData } from '../../../healthkit/transformHKtoChartData';
import { SFSymbol } from 'react-native-sfsymbols';
import { useTheme } from '../../../context/ThemeContext';
import AppText from '../../AppText';
import { workoutTypeToSFSymbol } from '../../../healthkit/workoutTypes';

interface WorkoutSummaryProps {
  data: WorkoutChartData[];
}

const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({ data }) => {
  const theme = useTheme();
  const sortedData = [...data].sort((a, b) => b.totalWorkouts - a.totalWorkouts);

  const renderWorkoutRow = (item: WorkoutChartData) => (
    <View key={item.workoutType} style={styles.row}>
      <View style={styles.iconContainer}>
        <SFSymbol
          name={workoutTypeToSFSymbol(item.workoutType)}
          weight="regular"
          size={36}
          color={theme.theme.colors.secondary}
          style={styles.icon}
        />
      </View>
      <View style={styles.details}>
        <AppText style={styles.workoutType}>
          {item.workoutType} ({item.totalWorkouts} workouts)
        </AppText>
        <AppText style={styles.stats}>
          {Math.round(item.averageDurationMinutes)} min average, {Math.round(item.totalDurationMinutes)} min total
        </AppText>
      </View>
    </View>
  );

  return (
    <>
      {sortedData.length > 0 ? (
        sortedData.map(renderWorkoutRow)
      ) : (
        <AppText style={styles.emptyText}>No workout data available</AppText>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    width: 24,
    height: 24,
  },
  details: {
    flex: 1,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stats: {
    fontSize: 14,
    color: '#555',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
  },
});

export default WorkoutSummary;