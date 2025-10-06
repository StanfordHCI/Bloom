import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import AppText from "../AppText";
import { WeekdayName, Workout, WeeklyPlan } from "../../context/plan/WeeklyPlan";
import WorkoutCard from "../workout/WorkoutCard";
import Card from "../Card";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { NavigationViews } from "../../navigation/AppNavigator";
import { DateTime } from "luxon";
import { SFSymbol } from "react-native-sfsymbols";
import WorkoutsCompleted from "./WorkoutsCompleted";
import LinkWorkoutModal from "../../components/plan/LinkWorkoutModal";
import WorkoutModal from "../../components/plan/WorkoutModal";
import DeleteWorkoutModal from "../../components/plan/DeleteWorkoutModal";
import { dismissWorkout } from "../../context/plan/modifyPlanUtils";

interface TodaysWorkoutProps {
  day: WeekdayName;
  gardenGrew?: boolean;
}

type JourneyMapNavigationProp = StackNavigationProp<
  NavigationViews,
  "JourneyWeekDetails"
>;

const TodaysWorkout: React.FC<TodaysWorkoutProps> = ({ day, gardenGrew = false }) => {
  const { theme } = useTheme();
  const { currentPlan, upcomingPlan, currentWeekIndex, currentProgress, modifyAndUpdatePlan } = usePlan();
  const navigation = useNavigation<JourneyMapNavigationProp>();

  const [modalVisible, setModalVisible] = useState(false);
  const [shouldRenderModal, setShouldRenderModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutModalType, setWorkoutModalType] = useState<"create" | "edit" | "complete">("create");
  const [isLinkingToPlan, setIsLinkingToPlan] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [isRestDayHidden, setIsRestDayHidden] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true)

  const todaysWorkouts = useMemo(() => {
    return currentPlan?.workoutsByDay?.[day] || [];
  }, [currentPlan, day]);

  const allWorkoutsDismissed = useMemo(() => {
    return todaysWorkouts.length > 0 && todaysWorkouts.every((w) => w.dismissed);
  }, [todaysWorkouts]);

  function handleModify(w: Workout) {
    setWorkoutModalType("edit");
    setSelectedWorkout(w);
    setShouldRenderModal(true);
    setModalVisible(true);
    setIsLinkingToPlan(false);
  }

  function handleComplete(w: Workout) {
    setSelectedWorkout(w);
    setWorkoutModalType("complete");
    setShouldRenderModal(true);
    setIsLinkingToPlan(false);
    setModalVisible(true);
  }

  function handleLinkToPlan(w: Workout) {
    setSelectedWorkout(w);
    setShouldRenderModal(true);
    setModalVisible(true);
    setIsLinkingToPlan(true);
  }

  function confirmLink() {
    setModalVisible(false);
    setIsLinkingToPlan(false);
  }

  function cancelModal() {
    setModalVisible(false);
    setSelectedWorkout(null);
    setIsLinkingToPlan(false);
  }

  function handleAdd() {
    setWorkoutModalType("create");
    setShouldRenderModal(true);
    setModalVisible(true);
    setIsLinkingToPlan(false);
  }

  // When delete is pressed in the WorkoutModal, mark a pending delete and hide the modal.
  function handleDelete(w: Workout) {
    setSelectedWorkout(w);
    setPendingDelete(true);
    setModalVisible(false);
  }

  const handleDismissWorkout = async (workoutId: string) => {
    if (!currentPlan) return;
    const modifications = [(plan: WeeklyPlan) => dismissWorkout(plan, workoutId)];
    await modifyAndUpdatePlan(modifications, currentPlan);
  };

  const AddButton = () => (
    <TouchableOpacity
      style={[styles.addButtonContainer, { backgroundColor: theme.colors.tertiary }]}
      onPress={handleAdd}
    >
      <AppText style={[styles.addButtonText, { color: theme.colors.primary }]}>
        Add Activity +
      </AppText>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (currentWeekIndex === -1 && upcomingPlan?.start) {
      const planStartString = DateTime.fromISO(upcomingPlan.start).toFormat("LLL dd");
      return (
        <View style={styles.upcomingPlanCard}>
          <Card>
            <TouchableOpacity
              style={styles.upcomingPlanContainer}
              onPress={() => navigation.navigate("Plan")}
            >
              <View style={styles.iconCircle}>
                <SFSymbol
                  name="clock.badge.exclamationmark"
                  weight="semibold"
                  scale="medium"
                  color={theme.colors.secondary}
                  style={styles.icon}
                />
              </View>
              <View style={styles.upcomingPlanTextContainer}>
                <AppText style={[styles.upcomingTitle, { color: theme.colors.darkGrey }]}>
                  Your Upcoming Plan
                </AppText>
                <AppText style={[styles.upcomingBody, { color: theme.colors.text }]}>
                  {`Your plan starts on Sun, ${planStartString}. Click here to review your upcoming plan.`}
                </AppText>
              </View>
            </TouchableOpacity>
          </Card>
        </View>
      );
    }

    if (!currentPlan) {
      return (
        <View style={styles.container}>
          <AppText style={[styles.title, { color: theme.colors.primary, fontWeight: "500" }]}>
            No plan found for this week.
          </AppText>
        </View>
      );
    }


    if (allWorkoutsDismissed && todaysWorkouts.length > 0) {
      return (
        <View style={styles.container}>
        { showCompleted && (
          <WorkoutsCompleted
            currentWeekIndex={currentWeekIndex}
            currentProgress={currentProgress}
            onDismiss={() => setShowCompleted(false)}
          />

        )}
          <AddButton />
        </View>
      );
    }

    if (allWorkoutsDismissed && !gardenGrew && !isRestDayHidden) {
      return (
        <View style={styles.container}>
          <Card>
            <View style={styles.upcomingPlanContainer}>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setIsRestDayHidden(true)}
              >
                <SFSymbol
                  name="xmark"
                  color={theme.colors.inactiveDark}
                  style={styles.xIcon}
                />
              </TouchableOpacity>
              <View style={styles.upcomingPlanTextContainer}>
                <AppText style={[styles.upcomingTitle, { color: theme.colors.darkGrey }]}>
                  Enjoy your rest day!
                </AppText>
                <AppText style={[styles.upcomingBody, { color: theme.colors.textDisabled }]}>
                  No workouts planned for today. Add a workout or check back tomorrow!
                </AppText>
              </View>
            </View>
          </Card>
          <AddButton />
        </View>
      );
    }

    if (allWorkoutsDismissed) {
      return (
        <View style={styles.container}>
          <AddButton />
        </View>
      );
    }

    // Default: display list of workouts
    return (
      <ScrollView key={JSON.stringify(currentPlan)}>
        {todaysWorkouts
          .filter((workout) => !workout.dismissed)
          .map((workout) => (
            <WorkoutCard
              key={workout.id.concat(JSON.stringify(workout.healthKitWorkoutData))}
              workout={workout}
              onComplete={() => handleComplete(workout)}
              onReschedule={() => handleModify(workout)}
              onLinkToPlan={() => handleLinkToPlan(workout)}
              onDismiss={(workoutId: string) => void handleDismissWorkout(workoutId)}
            />
          ))}
        <AddButton />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {modalVisible && selectedWorkout && isLinkingToPlan && (
        <LinkWorkoutModal
          visible={modalVisible}
          selectedWorkout={selectedWorkout}
          onCancel={cancelModal}
          onConfirm={confirmLink}
          weekIndex={currentWeekIndex}
        />
      )}

      {shouldRenderModal && (
        <WorkoutModal
          visible={modalVisible}
          mode={workoutModalType}
          restrictionType="none"
          onClose={() => setModalVisible(false)}
          onDelete={(workout: Workout) => handleDelete(workout)}
          onConfirm={() => setModalVisible(false)}
          onModalHide={() => {
            if (pendingDelete) {
              setDeleteModalVisible(true);
              setPendingDelete(false);
            }
            // Allow unmounting after animation completes
            setShouldRenderModal(false);
          }}
          plan={currentPlan!}
          {...(workoutModalType !== "create" &&
            selectedWorkout && { existingWorkout: selectedWorkout })}
        />
      )}

      {selectedWorkout && deleteModalVisible && (
        <DeleteWorkoutModal
          workout={selectedWorkout}
          plan={currentPlan!}
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
        />
      )}
    </View>
  );
};

export default TodaysWorkout;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    marginLeft: 0,
    marginVertical: 0,
  },
  upcomingPlanCard: {
    flex: 0,
  },
  upcomingPlanContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addButtonContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15,
    alignSelf: "flex-end",
    marginTop: 4,
    marginRight: 13,
    marginBottom: 0,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: "HankenGrotesk-Medium",
  },
  icon: {
    width: 30,
    height: 30,
  },
  upcomingPlanTextContainer: {
    flexShrink: 1,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  upcomingBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  xIcon: {
    width: 14,
    height: 14,
  },
});
