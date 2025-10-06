import { SkFont, matchFont } from '@shopify/react-native-skia';
import React from 'react';
import { View, Text } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { useTheme } from '../../../context/ThemeContext';

interface LineChartProps {
  data: { x: string; y: number | null }[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const theme = useTheme();
  const font: SkFont = matchFont({ fontFamily: 'Hanken Grotesk', fontSize: 12 });
  
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
      axisOptions={{
        font,
        formatXLabel: (label: string | number) =>
          label !== undefined ? (typeof label === 'string' ? label : `${label}`) : '',
      }}
    >
      {({ points }) => (
        <Line
          points={points.y}
          color={theme.theme.colors.secondary}
          strokeWidth={3}
        />
      )}
    </CartesianChart>
  );
};

export default LineChart;