import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import AppText from "../AppText";
import { TouchableOpacity } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";

interface WorkoutCardButtonProps {
  completed?: boolean;
  onComplete?: () => void;
  onUncomplete?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
  hideCompleteButton?: boolean;
  isHKWorkout: boolean;
  onLinKToPlan: () => void;
}

const WorkoutCardButtons: React.FC<WorkoutCardButtonProps> = ({
  completed = false,
  onComplete,
  onUncomplete,
  onEdit,
  hideCompleteButton = false,
  isHKWorkout,
  onLinKToPlan,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.actionsContainer}>
      {!isHKWorkout && (
        <TouchableOpacity
          style={[styles.iconButton]}
          onPress={onEdit}
        >
          <View style={styles.buttonContent}>
            <AppText style={[styles.buttonText, { color: '#3C3C43' }]}>Modify</AppText>
          </View>
        </TouchableOpacity>
      )}
      {isHKWorkout && (
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
          onPress={onLinKToPlan}
        >
          <View style={styles.buttonContent}>
            <AppText style={[styles.buttonText, { color: 'white' }]}>Link to plan</AppText>
          </View>
        </TouchableOpacity>
      )}
      {completed && (
        <TouchableOpacity
          style={styles.completedContainer}
          onPress={onUncomplete}
          disabled={isHKWorkout}
        >
          <SFSymbol name="checkmark.circle.fill" size={18} color={theme.colors.primary} style={styles.smallIcon} />
          <AppText
            style={[styles.completedText, { color: theme.colors.primary }]}
          >
            Completed
          </AppText>
        </TouchableOpacity>
      )}
      {!hideCompleteButton && (
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
          onPress={onComplete}
        >
          <View style={styles.buttonContent}>
            {/* <SFSymbol name="checkmark" size={18} color="white" /> */}
            <AppText style={[styles.buttonText, { color: 'white' }]}>Mark Complete</AppText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: "column",
    gap: 8,
    alignSelf: 'flex-end',
    marginTop: 'auto',
  },
  iconButton: {
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'stretch',
    minWidth: 125,
    backgroundColor: '#FFFFFF',
  },
  completedText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: 'HankenGrotesk-Medium',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'HankenGrotesk-Medium',
    flexShrink: 0,
  },
  smallIcon: {
    width: 20,
    height: 20,
    marginRight: 0,
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
});

export default WorkoutCardButtons;
