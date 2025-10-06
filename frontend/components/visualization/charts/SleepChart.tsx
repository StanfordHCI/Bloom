import React from 'react';
import { View, Text } from 'react-native';
import { matchFont, SkFont } from '@shopify/react-native-skia';
import { CartesianChart, StackedBar } from 'victory-native';
import { useTheme } from '../../../context/ThemeContext';
import { SleepChartData } from '../../../healthkit/transformHKtoChartData';

interface StackedBarChartProps {
  data: SleepChartData[];
}

const SleepChart: React.FC<StackedBarChartProps> = ({ data }) => {
  const font: SkFont = matchFont({ fontFamily: 'Hanken Grotesk', fontSize: 12 });
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>No data for StackedBarChart</Text>
      </View>
    );
  }

  // Transform data and calculate max domain
  const transformedData = data.map(({ x, asleep, inBed }) => ({
    x,
    asleep,
    leftover: (inBed ?? 0) - (asleep ?? 0),
  }));
  const maxY = Math.ceil(Math.max(...data.map(({ asleep, inBed }) => Math.max(inBed ?? 0, asleep ?? 0))) + 0.2); 

  return (
    <CartesianChart
      data={transformedData}
      xKey="x"
      yKeys={['asleep', 'leftover']}
      domainPadding={{ left: 30, right: 30 }}
      domain={{ y: [0, maxY] }} // Explicit max domain
      axisOptions={{
        font,
        formatXLabel: (label: string | number | undefined) => {
          if (label === undefined) {
            return ""
          } else {
            return typeof label === 'string' ? label : `${label}`;
          } 
        },
      }}
      padding={5}
        >
      {({ points, chartBounds }) => (
        <StackedBar
          points={[points.asleep, points.leftover]}
          chartBounds={chartBounds}
          colors={[theme.theme.colors.primary, theme.theme.colors.secondary]} // Define colors
          innerPadding={0.2}
          animate={{ type: 'spring' }}
          barOptions={({ isTop }) => {
            return {
              roundedCorners: isTop
                ? { topLeft: 5, topRight: 5 }
                : undefined,
            };
          }}
        />
      )}
    </CartesianChart>
  );
};

export default SleepChart;
