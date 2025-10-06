import React, { useState, useMemo } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import AppText from "../AppText";
import LinkWorkoutCard from "./LinkWorkoutCard";
import { HKWorkout } from "../../healthkit/HealthKitModule";
import { SFSymbol } from "react-native-sfsymbols";
import { workoutTypeToSFSymbol } from "../../healthkit/workoutTypes";
import { useTheme } from "../../context/ThemeContext";
import { hkWorkoutKey } from "../../context/plan/modifyPlanUtils";

interface WorkoutLinkingProps {
  mode: "create" | "edit" | "complete";
  hkWorkouts: HKWorkout[];
  selectedHKIDs: string[];
  setSelectedHKIDs: (hkIDs: string[]) => void;
  screenHeight: number;
}

const WorkoutLinking: React.FC<WorkoutLinkingProps> = ({
  hkWorkouts,
  selectedHKIDs,
  setSelectedHKIDs,
  screenHeight,
}) => {
  const [initialSelectedHKIDs] = useState(() => [...selectedHKIDs]);
  const { theme } = useTheme();

  const initialLinkedWorkouts = useMemo(
    () => hkWorkouts.filter((w) => initialSelectedHKIDs.includes(hkWorkoutKey(w))),
    [hkWorkouts, initialSelectedHKIDs]
  );

  const hasLinked = initialLinkedWorkouts.length > 0;
  const titleText = hasLinked
    ? initialLinkedWorkouts.length === 1
      ? "We found a matching activity on your wearable."
      : "We found matching activities on your wearable."
    : "We could not find a matching activity on your wearable.";

  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => setExpanded((prev) => !prev);

  // This handler updates the selectedHKIDs state via setSelectedHKIDs.
  const handleToggle = (hkId: string) => {
    const newSelected = selectedHKIDs.includes(hkId)
      ? selectedHKIDs.filter((id) => id !== hkId)
      : [...selectedHKIDs, hkId];
    setSelectedHKIDs(newSelected);
  };

  return (
    <View style={[styles.container, { maxHeight: screenHeight * 0.9 }]}>
      <AppText style={styles.title}>{titleText}</AppText>

      {hasLinked && (
        <View style={styles.linkedList}>
          {initialLinkedWorkouts.map((workout) => {
            const type = workout.workoutType;
            const weekday = new Date(workout.timeStart).toLocaleDateString("en-US", {
              weekday: "long",
            });
            const displayTitle = `${type} on ${weekday}`;
            const timeString = new Date(workout.timeStart).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            });
            return (
              <View key={workout.id} style={[styles.linkedWorkoutCard, { backgroundColor: "#91CF9633" }]}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.tertiary }]}>
                  <SFSymbol
                    name={workoutTypeToSFSymbol(type)}
                    style={styles.hkIcon}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.linkedWorkoutTextContainer}>
                  <AppText
                    style={styles.linkedWorkoutTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {displayTitle}
                  </AppText>
                  <AppText
                    style={styles.linkedWorkoutSubtitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {timeString} - {Math.round(workout.durationMin)} min
                  </AppText>
                </View>
                <AppText
                  style={styles.linkedWorkoutSource}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {workout.source}
                </AppText>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity onPress={toggleExpanded} style={styles.toggleButton}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <AppText style={{ color: theme.colors.primary, flex: 1 }}>
            {hasLinked
              ? "Doesn't look right? See other workouts"
              : "Did you record this activity on your wearable?"}
          </AppText>
          <SFSymbol
            name={expanded ? "chevron.down" : "chevron.right"}
            color={theme.colors.primary}
            style={{ marginLeft: 8, width: 12, height: 12 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (<>
        <AppText 
          style={{ fontSize: 14, color: theme.colors.inactiveDark }}
        >
          Link or unlink wearable activities below. Unlinked activities will be added as new entries in your history.
        </AppText>
        <ScrollView style={[styles.expandedList, { maxHeight: screenHeight * 0.25 }]}>
          {hkWorkouts.map((hkw) => {
            const isSelected = selectedHKIDs.includes(hkWorkoutKey(hkw));
            return (
              <LinkWorkoutCard
                key={hkw.id}
                workout={hkw}
                isSelected={isSelected}
                onToggle={handleToggle}
              />
            );
          })}
        </ScrollView>
      </>)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  linkedList: {
    marginBottom: 12,
  },
  linkedWorkoutCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  hkIcon: {
    width: 24,
    height: 24,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkedWorkoutTextContainer: {
    flex: 1,
  },
  linkedWorkoutTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  linkedWorkoutSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  linkedWorkoutSource: {
    fontSize: 12,
    color: "#333",
    marginLeft: 8,
  },
  toggleButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  expandedList: {
    marginTop: 8,
  },
});

export default WorkoutLinking;
