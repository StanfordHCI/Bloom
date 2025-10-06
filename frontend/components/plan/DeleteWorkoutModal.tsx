import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image
} from "react-native";
import Modal from "react-native-modal";
import AppText from "../AppText";
import { WeeklyPlan, Workout } from "../../context/plan/WeeklyPlan";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import { useAuth } from "../../context/AuthContext";
import {
  deleteWorkout
} from "../../context/plan/modifyPlanUtils";
import { shortenWorkoutType, workoutTypeToSFSymbol } from "../../healthkit/workoutTypes";
import { SFSymbol } from "react-native-sfsymbols";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { NavigationViews } from "../../navigation/AppNavigator";
import BeeImage from "../../assets/images/Bee.png";
import { doc, setDoc } from "firebase/firestore";
import { STUDY_ID } from "../../config";
import { firestore } from "../../firebase";
import { DateTime } from "luxon";
import { useAmbientDisplay } from "../../context/AmbientDisplayContext";

interface DeleteWorkoutModalProps {
  workout: Workout;
  plan: WeeklyPlan;
  visible: boolean;
  onClose: () => void;
}

const DeleteWorkoutModal: React.FC<DeleteWorkoutModalProps> = ({
  workout,
  plan,
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const { modifyAndUpdatePlan } = usePlan();
  const { uid, isControl } = useAuth();
  const { updateAmbientDisplay } = useAmbientDisplay();

  function confirmDelete() {
    const modifications: Array<(plan: WeeklyPlan) => WeeklyPlan> = [];
    modifications.push((plan: WeeklyPlan) => deleteWorkout(plan, workout.id));
    void modifyAndUpdatePlan(modifications, plan);
    void updateAmbientDisplay()
    onClose();
  }

  const type = workout.type;
  const weekday = new Date(workout.timeStart).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const displayTitle = `${shortenWorkoutType(type)} on ${weekday}`;
  const timeString = new Date(workout.timeStart).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
  const navigation = useNavigation<StackNavigationProp<NavigationViews>>();

  const handleChatWithBeebo = async () => {
    try {
      const dt = DateTime.fromISO(workout.timeStart);
      const prettyTime = dt.toFormat('h:mm a');
      const weekdayStr = dt.toFormat('cccc');
      const workoutTypeStr = shortenWorkoutType(workout.type);
      const templateMessage = `I hear you’d like to delete your ${prettyTime} ${workoutTypeStr} workout on ${weekdayStr}. Could you share why you'd like to make this change? Maybe we can find an alternate activity to keep you on track with your goals.`;
      console.log("Setting deleteMessage:", templateMessage);

      const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
      await setDoc(
        userDocRef,
        { deleteMessage: templateMessage },
        { merge: true }
      );

      onClose();
      navigation.navigate("TodayChatScreen" as never);
    } catch (e) {
      console.error("Failed to set deleteMessage:", e);
    }
  }

  return (
    <Modal isVisible={visible} avoidKeyboard>
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
              <AppText style={styles.modalTitle}>Delete Activity</AppText>
              <TouchableOpacity onPress={onClose}>
                <AppText style={styles.closeButton}>×</AppText>
              </TouchableOpacity>
            </View>

            {isControl && (
              <AppText variant="h3">Are you sure you want to delete this?</AppText>
            )}

            <View key={workout.id} style={[styles.linkedWorkoutCard, { backgroundColor: theme.colors.inactiveLight }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#b8b8b8" }]}>
                <SFSymbol
                  name={workoutTypeToSFSymbol(type)}
                  style={styles.hkIcon}
                  color={theme.colors.inactiveDark}
                />
              </View>
              <View style={styles.linkedWorkoutTextContainer}>
                <AppText style={styles.linkedWorkoutTitle}>{displayTitle}</AppText>
                <AppText style={styles.linkedWorkoutSubtitle}>
                  {timeString} - {Math.round(workout.durationMin)} min
                </AppText>
              </View>
            </View>

            {!isControl && (
              <View style={[
                styles.chatNavigation, 
                { backgroundColor: 'rgba(145, 207, 150, 0.2)' }
              ]}>
                <View style={{ flexDirection: "row", marginBottom: 6 }}>
                  <View>
                    <Image source={BeeImage} style={styles.beeImage} />
                  </View>
                  <View style={styles.beeHeadline}>
                    <AppText style={{fontWeight: 600}}>Are you sure you want to delete this?</AppText>
                  </View>
                </View>
                <View>
                  <AppText>We can chat about finding an alternate activity that still helps you reach your goals!</AppText>
                </View>
              </View>
            )}

            <View style={styles.buttonContainer}>
              {!isControl && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.colors.primary }]}
                  onPress={() => void handleChatWithBeebo()}
                >
                  <AppText style={styles.buttonText}>Chat With Beebo</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#666" }]}
                onPress={confirmDelete}
              >
                <AppText style={styles.buttonText}>Delete Activity</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default DeleteWorkoutModal;

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
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  container: {
    marginVertical: 8,
    paddingHorizontal: 12,
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
  chatNavigation: {
    borderRadius: 24,
    padding: 12,
    marginVertical: 12,
  },
  beeImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  beeHeadline: {
    marginLeft: 8,
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'flex-start',
  },
});
