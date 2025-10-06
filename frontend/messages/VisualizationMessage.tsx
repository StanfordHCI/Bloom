import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SampleType } from '../healthkit/sampleTypes';
import { DateTime } from 'luxon';
import HealthKitChart from '../components/visualization/HealthKitChart';

type AggregationLevel = 'day' | 'week' | 'month';

interface VisualizationMessageProps {
  sampleType: SampleType;
  aggregationLevel?: AggregationLevel | undefined;
  initialDate?: DateTime | undefined;
}

const VisualizationMessage: React.FC<VisualizationMessageProps> = ({ sampleType, aggregationLevel = undefined, initialDate = undefined }) => {
  return (
    <View style={styles.messageContainer}>
      <HealthKitChart
        sampleType={sampleType}
        isChatWidget={true}
        {...(aggregationLevel !== undefined && { initialAggregationLevel: aggregationLevel})}
        {...(initialDate !== undefined && { initialReferenceDate: initialDate })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
});

export default VisualizationMessage 
