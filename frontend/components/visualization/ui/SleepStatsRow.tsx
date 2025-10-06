import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import AppText from '../../AppText';

interface SleepStatsRowProps {
  avgInBed: number; // Average hours in bed
  avgAsleep: number; // Average hours asleep
  displayUnit: string;
}

const SleepStatsRow: React.FC<SleepStatsRowProps> = ({
  avgInBed,
  avgAsleep,
  displayUnit
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <View style={styles.labelContainer}>
            <View style={[styles.circle, { backgroundColor: theme.theme.colors.primary }]} />
            <AppText variant="p" style={styles.label}>AVG ASLEEP</AppText>
          </View>
          <AppText variant="p" style={styles.value}>
            {avgAsleep.toFixed(1)} {displayUnit}
          </AppText>
        </View>
        {avgInBed > 0 ?
          <View style={styles.stat}>
            <View style={styles.labelContainer}>
              <View style={[styles.circle, { backgroundColor: theme.theme.colors.secondary }]} />
              <AppText variant="p" style={styles.label}>AVG IN BED</AppText>
            </View>
            <AppText variant="p" style={styles.value}>
              {avgInBed.toFixed(1)} {displayUnit}
            </AppText>
          </View>
          : null
        }
      </View>
    </View>
  );
};

export default SleepStatsRow;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
