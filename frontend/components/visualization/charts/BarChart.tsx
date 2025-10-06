import React from 'react';
import { View, Text } from 'react-native';
import { matchFont, SkFont } from '@shopify/react-native-skia';
import { CartesianChart, Bar } from 'victory-native';
import { useTheme } from '../../../context/ThemeContext';

interface BarChartProps {
  data: { x: string; y: number | null }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const font: SkFont = matchFont({ fontFamily: 'Hanken Grotesk', fontSize: 12 });
  const theme = useTheme()

  if (!data || data.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>No data for BarChart</Text>
      </View>
    );
  }

  return (
    <CartesianChart
      data={data}
      xKey="x"
      yKeys={['y']}
      domainPadding={{ left: 30, right: 30 }}
      // @ts-expect-error: y domain should be [0, undefined]
      domain={{ y: [0, undefined] }}
      axisOptions={{
        font,
        formatXLabel: (label: string | number) =>
          label !== undefined ? (typeof label === 'string' ? label : `${label}`) : '',
      }}
    >
      {({ points, chartBounds }) => (
        <Bar
          points={points.y}
          chartBounds={chartBounds}
          color={theme.theme.colors.secondary}
          innerPadding={0.33}
          roundedCorners={{ topLeft: 5, topRight: 5 }}
        />
      )}
    </CartesianChart>
  );
};

export default BarChart;