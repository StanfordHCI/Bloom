import React from 'react';
import { View, StyleSheet } from 'react-native';
import BarChart from './charts/BarChart';
import LineChart from './charts/LineChart';
import SleepChart from './charts/SleepChart';
import WorkoutSummary from './charts/WorkoutSummary';
import { ChartType } from '../../healthkit/sampleTypes';

import CountStatsRow from './ui/CountStatsRow';
import RateStatsRow from './ui/RateStatsRow';
import SleepStatsRow from './ui/SleepStatsRow';
import WorkoutStatsRow from './ui/WorkoutStatsRow';
import { Stats } from '../../healthkit/healthKitStats';
import { ChartData, QuanitityChartData, SleepChartData, WorkoutChartData } from '../../healthkit/transformHKtoChartData';
import AppText from '../AppText';

interface ChartContainerProps {
  chartType: ChartType;
  data: ChartData[];
  stats: Stats | null;
  isLoading: boolean;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  chartType,
  data,
  stats
}) => {
  const renderStatsRow = () => {
    if (!stats || !data || data.length === 0) return null;

    switch (stats.type) {
      case 'count':
        return (
          <CountStatsRow
            total={stats.total}
            average={stats.average}
            displayUnit={stats.unit}
          />
        );
      case 'rate':
        return (
          <RateStatsRow
            average={stats.average}
            min={stats.min}
            max={stats.max}
            displayUnit={stats.unit}
          />
        );
      case 'sleep':
        return (
          <SleepStatsRow
            avgInBed={stats.avgInBed}
            avgAsleep={stats.avgAsleep}
            displayUnit={stats.unit}
          />
        );
      case 'workout':
        return (
          <WorkoutStatsRow
            totalWorkouts={stats.totalWorkouts}
            totalDuration={stats.totalDuration}
            avgDuration={stats.avgDuration}
          />
        );
      default:
        return null;
    }
  };

  const renderChart = () => {
    if (!data || data.length === 0) {
      return null
    }

    switch (chartType) {
      case ChartType.Bar:
        return (
          <View style={styles.chartRow}>
            <BarChart data={data as QuanitityChartData[]} />
          </View>
        );
      case ChartType.Line:
        return (
          <View style={styles.chartRow}>
            <LineChart data={data as QuanitityChartData[]} />
          </View>
        );
      case ChartType.Sleep:
        return (
          <View style={styles.chartRow}>
            <SleepChart data={data as SleepChartData[]} />
          </View>
        );
      case ChartType.Workout:
        return (
          <View style={styles.chartRow}>
            <WorkoutSummary data={data as WorkoutChartData[]} />
          </View>
        );
      default:
        return (
          <View style={[styles.chartRow, styles.centerContent]}>
            <AppText variant="p" style={styles.noDataText}>Not implemented chart type</AppText>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderStatsRow()}
      {renderChart()}
    </View>
  );
};

export default ChartContainer;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  chartRow: {
    minHeight: 200,
    width: '100%',
    paddingBottom: 10,
  },
  noDataText: {
    color: '#888',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
