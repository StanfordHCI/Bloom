import React, { useState, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard
} from "react-native";
import Modal from "react-native-modal";
import { DateTime } from "luxon";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AppText from "../AppText";
import { WeeklyPlan, Workout } from "../../context/plan/WeeklyPlan";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import WorkoutForm from "./WorkoutForm";
import WorkoutLinking from "./WorkoutLinking";
import {
  addWorkout,
  updateWorkout,
  setCompletion,
  linkHKWorkouts,
  deleteWorkout,
  hkWorkoutKey
} from "../../context/plan/modifyPlanUtils";

const modeMap = {
  create: {
    title: "Add Activity",
    confirmText: "Add Activity",
  },
  complete: {
    title: "Mark Complete",
    confirmText: "Mark Complete",
  },
  edit: {
    title: "Modify Activity",
    confirmText: "Confirm",
  },
};

interface WorkoutModalProps {
  visible: boolean;
  mode: "create" | "edit" | "complete";
  existingWorkout?: Workout;
  onConfirm: (plan: WeeklyPlan) => void;
  onClose: () => void;
  forceDay?: string | null; // expects an ISO date string (e.g. "2025-02-19") or null
  plan: WeeklyPlan;
  onDelete?: (workout: Workout) => void;
  restrictionType?: "none" | "planCreation"
  onModalHide?: () => void;
}

const WorkoutModal: React.FC<WorkoutModalProps> = ({
  visible,
  mode,
  restrictionType = "none",
  existingWorkout,
  onClose,
  onConfirm,
  forceDay,
  onDelete,
  plan,
  onModalHide,
}) => {
  const { theme } = useTheme();
  const { modifyAndUpdatePlan } = usePlan();

  const defaultWorkout: Workout = {
    id: uuidv4(),
    durationMin: 30,
    intensity: "moderate",
    timeStart: forceDay ?? DateTime.now().toISO(),
    type: "walking",
    completed: false,
    isPlanWorkout: true,
    isHKWorkout: false,
  };

  const base = existingWorkout ?? defaultWorkout;

  const [initialLinkedHKIDs] = useState<string[]>(() =>
    base.healthKitWorkoutData ? base.healthKitWorkoutData.map((h) => hkWorkoutKey(h)) : []
  );
  const [selectedHKIDs, setSelectedHKIDs] = useState<string[]>(() => initialLinkedHKIDs);
  const [localWorkout, setLocalWorkout] = useState<Workout>(existingWorkout ?? defaultWorkout);

  const allWorkouts = useMemo(() => Object.values(plan.workoutsByDay).flat(), [plan]);
  const hkWorkouts = useMemo(() => {
    const hkData = allWorkouts
      .filter((w) => w.isHKWorkout)
      .flatMap((w) => w.healthKitWorkoutData || []);
    const combinedhkData = hkData.concat(localWorkout.healthKitWorkoutData || []);
    return Array.from(new Map(combinedhkData.map((w) => [w.id, w])).values());
  }, [allWorkouts, localWorkout]);

  const formRef = useRef<{ getFinalDuration: () => number }>(null);

  function handleConfirm() {
    Keyboard.dismiss();
    const finalDuration = formRef.current?.getFinalDuration();
    const updatedWorkout = finalDuration !== undefined
      ? { ...localWorkout, durationMin: finalDuration }
      : localWorkout;
      
    const modifications: Array<(plan: WeeklyPlan) => WeeklyPlan> = [];
    if (mode === "complete" && existingWorkout) {
      modifications.push((plan: WeeklyPlan) => setCompletion(plan, existingWorkout.id, true));
    }

    if (mode === "edit") {
      modifications.push((plan) => updateWorkout(plan, updatedWorkout.id, updatedWorkout));
    } else if (mode === "create") {
      modifications.push((plan) => addWorkout(plan, updatedWorkout));
    }

    const linkingChanged =
      JSON.stringify(initialLinkedHKIDs.sort()) !==
      JSON.stringify(selectedHKIDs.sort());

    if (linkingChanged) {
      modifications.push((plan) => linkHKWorkouts(plan, updatedWorkout.id, selectedHKIDs));
    }

    // confirm
    if (restrictionType === "planCreation") {
      modifications.forEach((modify) => {
        plan = modify(plan);
      });
    } else {
      void modifyAndUpdatePlan(modifications, plan);
    }
    onConfirm(plan);
  }

  const handleDeleteWorkout = () => {
    if (!existingWorkout) return;
    if (restrictionType === "planCreation") {
      plan = deleteWorkout(plan, existingWorkout.id);
      onConfirm(plan);
      onClose();
    } else if (onDelete) {
      onDelete(existingWorkout);
    } else {
      console.error("onDelete not provided for unrestricted WorkoutModal!");
    }
  }

  const screenHeight = Dimensions.get("window").height;

  return (
    <Modal isVisible={visible} avoidKeyboard onModalHide={onModalHide}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          style={{ marginTop: 40 }}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <AppText style={styles.modalTitle}>
                {modeMap[mode].title}
              </AppText>
              <TouchableOpacity onPress={onClose}>
                <AppText style={styles.closeButton}>×</AppText>
              </TouchableOpacity>
            </View>

            {/* Workout Form */}
            <WorkoutForm
              ref={formRef}
              mode={mode}
              restrictionType={restrictionType}
              workout={localWorkout}
              onChange={setLocalWorkout}
              forceDay={forceDay}
              planStart={plan.start}
              planEnd={plan.end}
            />
            <View style={{ borderBottomColor: theme.colors.inactiveLight, borderBottomWidth: 1, }} />

            {/* Workout Linking */}
            {restrictionType !== "planCreation" && (
              <View style={{ padding: 0 }}>
                <WorkoutLinking
                  mode={mode}
                  hkWorkouts={hkWorkouts}
                  selectedHKIDs={selectedHKIDs}
                  setSelectedHKIDs={setSelectedHKIDs}
                  screenHeight={screenHeight}
                />
                <View style={{ borderBottomColor: theme.colors.inactiveLight, borderBottomWidth: 1, }} />
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={handleConfirm}
              >
                <AppText style={styles.buttonText}>
                  {modeMap[mode].confirmText}
                </AppText>
              </TouchableOpacity>
              {existingWorkout && mode === "edit" && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#666" }]}
                  onPress={() => handleDeleteWorkout()}
                >
                  <AppText style={styles.buttonText}>Delete</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default WorkoutModal;

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
  buttonContainer: {
    flexDirection: "column",
    marginTop: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    flex: 1,
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    width: '100%'
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
