import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../AppText';

interface RateStatsRowProps {
  average: number;
  min: number;
  max: number;
  displayUnit: string;
}

const RateStatsRow: React.FC<RateStatsRowProps> = ({
  average,
  min,
  max,
  displayUnit
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View>
          <AppText variant="p" style={styles.label}>AVERAGE</AppText>
          <AppText variant="p" style={styles.value}>
            {average.toFixed(2)} {displayUnit}
          </AppText>
        </View>
        <View>
          <AppText variant="p" style={styles.label}>MIN</AppText>
          <AppText variant="p" style={styles.value}>
            {min.toFixed(2)} {displayUnit}
          </AppText>
        </View>
        <View>
          <AppText variant="p" style={styles.label}>MAX</AppText>
          <AppText variant="p" style={styles.value}>
            {max.toFixed(2)} {displayUnit}
          </AppText>
        </View>
      </View>
    </View>
  );
};

export default RateStatsRow;

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
