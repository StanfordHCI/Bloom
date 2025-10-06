import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { rootNavigationRef } from "../App";
import { SFSymbol } from "react-native-sfsymbols";

import Card from "./Card";
import AppText from "./AppText";
import { usePlan } from "../context/plan/WeeklyPlanContext";

const CheckInCard: React.FC = () => {
  const { theme } = useTheme();
  const { checkInTimeLocal, checkInState } = usePlan();
  const formattedCheckinTime = checkInTimeLocal?.toFormat("ccc, LLL d 'at' h:mma") || "";

  const handleReschedule = () => {
    rootNavigationRef.current?.navigate("CheckInFlow", {
      screen: "RescheduleCheckIn",
    });
  };
  const handleStartNow = () => {
    rootNavigationRef.current?.navigate("CheckInFlow");
  };
  

  let iconName = "clock.badge.exclamationmark";
  let iconColor = theme.colors.primary;
  let headline = "";
  let bodyText = "";
  let showReschedule = true;
  let showStartNow = true;
  let iconCircleColor = theme.colors.inactiveLight;
  let startButtonColor = theme.colors.primary;

  switch (checkInState) {
    // Your checkin is upcoming, but you can't start it yet
    case "upcoming-inactive":
      iconName = "hourglass.and.lock";
      iconColor = theme.colors.inactiveDark;
      headline = "Your Upcoming Check-In";
      bodyText = `Your check-in is scheduled for ${formattedCheckinTime}.`;
      showStartNow = false;
      break;

    // Your checkin is upcoming and you can start it
    case "upcoming-active":
      iconName = "hourglass";
      iconColor = theme.colors.primary;
      headline = "Your Upcoming Check-In";
      bodyText = `Your check-in is scheduled for ${formattedCheckinTime}.`;
      iconCircleColor = theme.colors.tertiary;
      break;

    // Your checkinTime is in the past but you are not yet late
    case "active":
    case "error-present": // current plan, checkinTime in past, but not Fri/Sat (unexpected)
      iconName = "alarm.waves.left.and.right";
      iconColor = theme.colors.primary;
      headline = "Time for Your Check-In!";
      bodyText = "Start your check-in now to create your plan for next week.";
      iconCircleColor = theme.colors.tertiary;
      break;

    // Your checkinTime is in the past and you are behind schedule.
    case "missed":
    case "error-missing":
      iconName = "exclamationmark.triangle.fill";
      iconColor = "#FF8C00";
      headline = "Complete Your Check-In Now";
      bodyText = `You do not have a plan for this week yet. Start your check-in to get back on track.`;
      showReschedule = false;
      iconCircleColor = "#FFE5CC"
      startButtonColor = "#FF8C00";
      break;

    default:
      return null;
  }

  return (
    <Card style={styles.cardContainer}>
      <View style={styles.titleRow}>
        <AppText style={styles.headline}>{headline}</AppText>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.leftContainer}>
          <View style={[
              styles.iconCircle, 
              { backgroundColor: iconCircleColor },
            ]}>
            <SFSymbol
              name={iconName}
              weight="semibold"
              scale="medium"
              color={iconColor}
              style={styles.icon}
            />
          </View>
          <View style={{ flexShrink: 1 }}>
            <AppText style={styles.bodyText}>{bodyText}</AppText>
          </View>
        </View>
        <View style={styles.rightContainer}>
          <View style={styles.buttonContainer}>
            {showReschedule && (
              <TouchableOpacity
                style={[styles.button, styles.rescheduleButton]}
                onPress={handleReschedule}
              >
                <AppText style={[styles.buttonText, styles.rescheduleButtonText]}>
                  Reschedule
                </AppText>
              </TouchableOpacity>
            )}
            {showStartNow && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: startButtonColor }]}
                onPress={handleStartNow}
              >
                <AppText style={[styles.buttonText, { color: "white" }]}>
                  Start Now
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

export default CheckInCard;

const styles = StyleSheet.create({
  cardContainer: {
    padding: 16,
  },
  spinnerContainer: {
    padding: 16,
    alignItems: "center",
  },
  titleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    height: 'auto',
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 8,
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    width: 40,
    height: 40,
    marginTop: -5,
  },
  headline: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  bodyText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  button: {
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "stretch",
    minWidth: 125,
  },
  buttonText: {
    fontSize: 14,
  },
  rescheduleButton: {
    backgroundColor: "#FFFFFF",
  },
  rescheduleButtonText: {
    color: "#3C3C43",
  },
});
