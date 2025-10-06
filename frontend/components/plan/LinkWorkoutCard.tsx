import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import AppText from "../AppText";
import { shortenWorkoutType, workoutTypeToSFSymbol } from "../../healthkit/workoutTypes";
import { useTheme } from "../../context/ThemeContext";
import { HKWorkout } from "../../healthkit/HealthKitModule";
import { Workout } from "../../context/plan/WeeklyPlan";
import { hkWorkoutKey } from "../../context/plan/modifyPlanUtils";

interface LinkWorkoutCardProps {
  workout: HKWorkout | Workout;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const LinkWorkoutCard: React.FC<LinkWorkoutCardProps> = ({
  workout,
  isSelected,
  onToggle,
}) => {
  const { theme } = useTheme();
  const type = (workout as HKWorkout).workoutType ?? (workout as Workout).type;
  const weekday = new Date(workout.timeStart).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const title = `${shortenWorkoutType(type)} on ${weekday}`;
  const timeString = new Date(workout.timeStart).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => onToggle(hkWorkoutKey(workout))}
    >
      {/* Left: Workout SFSymbol */}
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.tertiary }]}>
        <SFSymbol
          name={workoutTypeToSFSymbol(type)}
          style={styles.hkIcon}
          color={theme.colors.primary}
        />
      </View>

      {/* Middle: Title and details */}
      <View style={styles.cardContent}>
        <AppText style={styles.cardTitle}>{title}</AppText>
        <AppText style={styles.cardSubtitle}>
          {timeString} - {Math.round(workout.durationMin)} min
        </AppText>
      </View>

      {/* Right: Source and checkbox */}
      <View style={styles.cardRight}>
        <AppText style={styles.cardSource}>
          {(workout as HKWorkout).source || ""}
        </AppText>
        {isSelected ? (
          <SFSymbol
            name="checkmark.square.fill"
            color="green"
            style={{ width: 24, height: 24, marginLeft: 4 }}
          />
        ) : (
          <SFSymbol
            name="square"
            color="gray"
            style={{ width: 24, height: 24, marginLeft: 4 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  hkIcon: {
    width: 24,
    height: 24,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cardSource: {
    fontSize: 12,
    color: "#333",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});

export default LinkWorkoutCard;
