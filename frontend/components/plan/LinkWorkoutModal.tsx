import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import Modal from "react-native-modal";
import AppText from "../AppText";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import { Workout, WeekdayName } from "../../context/plan/WeeklyPlan";
import LinkWorkoutCard from "./LinkWorkoutCard";
import PlanWidgetUI from "../PlanWidgetUI";
import { hkWorkoutKey, updateWorkout } from "../../context/plan/modifyPlanUtils";

interface LinkWorkoutModalProps {
  visible: boolean;
  selectedWorkout: Workout;
  onCancel: () => void;
  onConfirm: () => void;
  weekIndex: number;
}

function getWeekdayName(dateString: string): string {
  const date = new Date(dateString);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[date.getDay()];
}

function capitalize(s: string): string {
  return String(s[0]).toUpperCase() + String(s).slice(1);
}

const LinkWorkoutModal: React.FC<LinkWorkoutModalProps> = ({
  visible,
  selectedWorkout,
  onCancel,
  onConfirm,
  weekIndex,
}) => {
  const { theme } = useTheme();
  const [selectedTarget, setSelectedTarget] = useState<null | Workout>(null);
  const { plansByWeek, updatePlan } = usePlan();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const plan = plansByWeek[weekIndex];
  const screenHeight = Dimensions.get("window").height;

  useEffect(() => {
    if (!plan) return;

    const allWorkouts = Object.values(plan.workoutsByDay).flat();
    const hkWorkoutsFromPlan = allWorkouts.filter(workout => !workout.isHKWorkout);

    hkWorkoutsFromPlan.sort((a, b) => new Date(a.timeStart).getTime() - new Date(b.timeStart).getTime());

    setWorkouts(hkWorkoutsFromPlan);
  }, [plan, selectedWorkout]);

  const handleToggle = (id: string) => {
    if (selectedTarget && hkWorkoutKey(selectedTarget) === id) {
      setSelectedTarget(null);
    } else {
      setSelectedTarget(workouts.find((w) => hkWorkoutKey(w) === id) || null);
    }
  }

  function handleConfirm() {
    if (!plan) return;
    let updatedPlan = { ...plan };

    if (selectedTarget) {
      updatedPlan.workoutsByDay = Object.fromEntries(
        Object.entries(plan.workoutsByDay).map(([day, workouts]) => {
          const updatedWorkouts = workouts
            .map((w) => {
              if (w.id === selectedTarget.id) {
                return {
                  ...w,
                  completed: true,
                  healthKitWorkoutData: [
                    ...(w.healthKitWorkoutData || []),
                    ...(selectedWorkout.healthKitWorkoutData || [])
                  ]
                };
              }
              return w;
            })
            .filter((w) => w.id !== selectedWorkout.id);
          return [day, updatedWorkouts];
        })
      ) as Record<WeekdayName, Workout[]>;
    } else {
      // If no workout selected, update selectedWorkout to set isHKWorkout to false
      updatedPlan = updateWorkout(updatedPlan, selectedWorkout.id, { isHKWorkout: false });
    }

    console.log("Updated Plan: ", JSON.stringify(updatedPlan));
    void updatePlan(updatedPlan, plan.id);
    onConfirm();
  }

  return (
    <Modal isVisible={visible} avoidKeyboard>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" style={{ marginTop: 40 }}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <AppText style={styles.modalTitle}>Link to Plan</AppText>
              <TouchableOpacity onPress={onCancel}>
                <AppText style={styles.closeButton}>×</AppText>
              </TouchableOpacity>
            </View>
            <AppText variant="h3">Was this activity part of your plan?</AppText>
            <AppText>
              If this activity was part of your plan, select the planned activity it corresponds to below.{"\n\n"}
              If this activity was not part of your plan, you can add this to your plan as a new activity.
            </AppText>
            {plan && (
              <View style={{ paddingBottom: 16, paddingTop: 16, marginHorizontal: -6 }}>
                <PlanWidgetUI
                  workoutsByDay={plan.workoutsByDay}
                  planStart={plan.start}
                  isPlanWidgetMessage={true}
                />
              </View>
            )}
            <View style={styles.formSection}>
              <ScrollView style={{ maxHeight: screenHeight * 0.3 }}>
                {workouts.map((workout) => (
                  <LinkWorkoutCard
                    key={workout.id}
                    workout={workout}
                    isSelected={selectedTarget?.id === workout.id}
                    onToggle={handleToggle}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={handleConfirm}
                disabled={!selectedWorkout}
              >
                <AppText style={styles.buttonText}>
                  {selectedTarget
                    ? `Link to ${getWeekdayName(selectedTarget.timeStart)} ${capitalize(selectedTarget.type)}`
                    : "Add to Plan as New Activity"}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default LinkWorkoutModal;

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
  closeButton: {
    fontSize: 28,
    lineHeight: 28,
  },
  formSection: {
    marginVertical: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
