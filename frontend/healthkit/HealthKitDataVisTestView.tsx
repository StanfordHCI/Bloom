import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import HealthKitChart from '../components/visualization/HealthKitChart';
import { SampleType } from './sampleTypes';
import SegmentedButton from '../components/visualization/ui/SegmentedButton';

// We'll assume 'AggregationLevel' is exported somewhere (or replicate it)
type AggregationLevel = 'day' | 'week' | 'month';

const sampleTypes: SampleType[] = [
  'stepCount',
  'distanceWalkingRunning',
  'basalEnergyBurned',
  'activeEnergyBurned',
  'flightsClimbed',
  'appleExerciseTime',
  'appleMoveTime',
  'appleStandTime',
  'heartRate',
  'restingHeartRate',
  'heartRateVariabilitySDNN',
  'walkingHeartRateAverage',
  'sleepAnalysis',
  'workout',
];

const HealthKitDataVisTestView = () => {
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>('week');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>HealthKit Data Visualization Test</Text>

      {/* Our aggregator toggle row */}
      <View style={styles.toggleRow}>
        {(['day', 'week', 'month'] as AggregationLevel[]).map((level) => (
          <SegmentedButton
            key={level}
            label={level.charAt(0).toUpperCase() + level.slice(1)}
            active={aggregationLevel === level}
            onPress={() => setAggregationLevel(level)}
          />
        ))}
      </View>

      {/* Render a chart card for each supported sample type */}
      {sampleTypes.map((type) => (
        <View key={type} style={styles.chartBlock}>
          <HealthKitChart
            sampleType={type}
            initialAggregationLevel={aggregationLevel} // pass down
          />
        </View>
      ))}
    </ScrollView>
  );
};

export default HealthKitDataVisTestView;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chartBlock: {
    width: '100%',
    marginBottom: 24,
  },
});
