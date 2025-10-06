import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import PlanWidgetUI from "../components/PlanWidgetUI";
import { WeeklyPlan } from "../context/plan/WeeklyPlan";

const PlanWidgetMessage: React.FC<{ plan: WeeklyPlan }> = ({ plan }) => {
  const { theme } = useTheme();

  if (!plan || !plan.workoutsByDay) {
    return (
      <View>
        <Text style={{ color: theme.colors.text }}>
          No weekly plan available.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        <View style={styles.widgetContainer}>
          <PlanWidgetUI
            workoutsByDay={plan.workoutsByDay}
            planStart={plan.start}
            isCollapsed={false}
            isPlanWidgetMessage={true}
          />
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center'
  },
  widgetContainer: {
    width: '100%'
  }
});

export default PlanWidgetMessage;
