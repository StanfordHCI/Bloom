import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../AppText';

interface CountStatsRowProps {
  total?: number; // If aggregation level is 'day'
  average?: number; // If aggregation level is 'week' or 'month'
  displayUnit: string;
}

const CountStatsRow: React.FC<CountStatsRowProps> = ({
  total,
  average,
  displayUnit
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        {total !== undefined && (
          <View style={styles.statItem}>
            <AppText variant="p" style={styles.label}>TOTAL</AppText>
            <AppText variant="p" style={styles.value}>
              {Math.round(total)} {displayUnit}
            </AppText>
          </View>
        )}
        {average !== undefined && (
          <View style={styles.statItem}>
            <AppText style={styles.label}>AVERAGE</AppText>
            <AppText style={styles.value}>
              {Math.round(average)} {displayUnit}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
};

export default CountStatsRow;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  statItem: {
    alignItems: 'flex-start',
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