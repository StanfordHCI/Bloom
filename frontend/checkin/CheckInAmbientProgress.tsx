import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Image, Dimensions, ActivityIndicator } from "react-native";
import AppText from "../components/AppText";
import { storage } from "../firebase.ts";
import { ref, getDownloadURL } from "firebase/storage";
import { useAmbientDisplay } from "../context/AmbientDisplayContext";
import activeLeafIcon from "../assets/images/leaf-icon.png";
import inactiveLeafIcon from "../assets/images/leaf-icon-inactive.png";
import { useCheckIn } from "../context/CheckInContext";
import { useAuth } from "../context/AuthContext";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import { DateTime } from "luxon";
import CheckInHeaderFooter from '../components/checkin/CheckInHeaderFooter';
import { useTheme } from "../context/ThemeContext";

const TOTAL_LEAVES = 5;
const LEAF_SIZE = 26;

const CheckInAmbientProgress: React.FC = () => {
  const { theme } = useTheme();
  const { nextStepFrom} = useCheckIn();
  const { activeAmbientDoc } = useAmbientDisplay();
  const { isControl = false } = useAuth();
  const { currentPlan, currentWeekIndex, plansByWeek, initialized } = usePlan();

  const [imageURL, setImageURL] = useState<string>("");
  const [cropParams, setCropParams] = useState<{
    croppedWidth: number;
    croppedHeight: number;
    uncroppedHeight: number;
    translateY: number;
  } | null>(null);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Determine which week's plan we are reviewing
  const weekToReview = useMemo(() => {
    const now = DateTime.local();
    const dayOfWeek = now.weekday % 7; // 0=Sun, 1=Mon,... 6=Sat
    const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;

    if (isFriSat && currentPlan) {
      return currentWeekIndex;
    } else {
      return currentWeekIndex - 1;
    }
  }, [currentPlan, currentWeekIndex]);

  // Calculate progress from that plan
  const { progress, upcomingCount, isCurrentWeek } = useMemo(() => {
    const planToReview = plansByWeek[weekToReview];
    if (!planToReview?.workoutsByDay) {
      console.error("Ambient Progress - No workouts found for week:", weekToReview);
      return { progress: 0, upcomingCount: 0, isCurrentWeek: false };
    }

    const now = DateTime.local();
    const isCurrentWeek = weekToReview === currentWeekIndex;

    const allWorkouts = Object.values(planToReview.workoutsByDay).flat();
    console.log("Progress calculation:", {
      weekToReview,
      currentWeekIndex,
      totalWorkouts: allWorkouts.length,
      workouts: allWorkouts.map(w => ({
        completed: w.completed,
        time: w.timeStart
      }))
    });

    let completed = 0;
    let upcoming = 0;
    let total = 0;

    allWorkouts.forEach((w) => {
      total++;
      if (w.completed) {
        completed++;
      } else if (isCurrentWeek) {
        // Check if it's upcoming
        const workoutTime = DateTime.fromISO(w.timeStart);
        if (workoutTime > now) {
          upcoming++;
        }
      }
    });

    return {
      progress: total > 0 ? completed / total : 0,
      upcomingCount: upcoming,
      isCurrentWeek: isCurrentWeek,
    };
  }, [weekToReview, currentPlan, currentWeekIndex, plansByWeek]);

  const { width: screenWidth } = Dimensions.get('window');
  const modalWidth = screenWidth * 0.85;
  const modalPadding = 20;

  useEffect(() => {
    if (!activeAmbientDoc?.url) return;
    const pathRef = ref(storage, activeAmbientDoc.url);
    getDownloadURL(pathRef)
      .then((downloadURL) => {
        setImageURL(downloadURL);
      })
      .catch((err) => {
        console.error("Failed to get storage URL:", err);
      });
  }, [activeAmbientDoc?.url]);

  useEffect(() => {
    if (!imageURL) return;

    Image.getSize(
      imageURL,
      (origWidth, origHeight) => {
        let croppedWidth = modalWidth - 2 * modalPadding;
        const scaleFactor = croppedWidth / 1320;
        croppedWidth = Math.round(croppedWidth);

        const uncroppedHeight = Math.round(origHeight * scaleFactor);
        const croppedHeight = Math.round(1386 * scaleFactor);
        const translateY = (uncroppedHeight - croppedHeight) - 2 * modalPadding - 1;

        setCropParams({
          croppedWidth,
          croppedHeight,
          uncroppedHeight,
          translateY,
        });
      },
      (error) => {
        console.error("Error getting image size:", error);
      }
    );
  }, [imageURL, screenWidth]);

  const progressLeaves = progress * TOTAL_LEAVES;

  const handleContinue = () => {
    console.log("Ambient progress - handleContinue");
    return Promise.resolve(nextStepFrom("CheckInAmbientProgress"));
  };

  const getProgressMessage = (progressPct: number) => {
    const weekText = isCurrentWeek ? "this week" : "last week";
    const canReach100 = Math.round((progress + (upcomingCount / TOTAL_LEAVES)) * 100) === 100;

    if (progressPct === 100) {
      if (weekToReview < 4) {
        return `Congratulations! You've accomplished everything you set out to do ${weekText}. Your garden will grow to show your amazing progress, bringing you one step closer to full bloom.`;
      }
      return `Congratulations on completing all your workouts ${weekText}! Your dedication has paid off, and a beautiful new flower has bloomed in your garden as a reward.`;
    }

    // If it's Fri/Sat with upcoming workouts
    if (upcomingCount > 0) {
      if (canReach100) {
        if (weekToReview < 4) {
          return `Almost there! 🌱 Complete your ${upcomingCount} remaining workout${
            upcomingCount === 1 ? '' : 's'
          } and watch your garden grow beautifully. You're so close to reaching your goal!`;
        }
        return `You're doing amazing! 🌸 Just ${upcomingCount} more workout${
          upcomingCount === 1 ? '' : 's'
        } to go and a beautiful new flower will bloom in your garden. You can do this!`;
      } else {
        return `Keep up the great work! You've completed ${Math.round(progressPct)}% of your workouts ${weekText}, and you only have ${upcomingCount} workout${
          upcomingCount === 1 ? '' : 's'
        } ahead. Almost there!`;
      }
    }

    // Regular cases for non-perfect completion
    let message = "";
    if (progressPct >= 50) {
      message = `Great effort ${weekText}! You're making wonderful progress, and while your garden will reset for the new week, completing all your workouts next time will bring a beautiful new flower to life. `;
    } else {
      message = `Life can get busy, and that's okay! Your garden will get a fresh start next week, and we know you'll do amazing things. Remember, each workout helps your garden bloom. `;
    }

    message += isControl
      ? "You can adjust your plan for next week to help you reach your goals! 🌱"
      : "We'll explore together how to reach your goals next time—you've got this! 🌱";

    return message;
  };

  return (
    <CheckInHeaderFooter
      title="Your Progress"
      nextStep="CheckInAmbientProgress"
      onBeforeNext={handleContinue}
    >
      <View style={styles.contentContainer}>
        <AppText style={styles.progressText}>
          {isCurrentWeek ? "This week" : "Last week"}, you completed {Math.round(progress * 100)}% of your planned workouts.
        </AppText>

        <View style={styles.leafRow}>
          {Array.from({ length: TOTAL_LEAVES }).map((_, index) => {
            const fill = Math.min(Math.max(progressLeaves - index, 0), 1);
            return (
              <View key={index} style={{ width: LEAF_SIZE, height: LEAF_SIZE }}>
                <Image
                  source={inactiveLeafIcon}
                  style={{ width: LEAF_SIZE, height: LEAF_SIZE, position: "absolute" }}
                />
                <View
                  style={{
                    width: LEAF_SIZE * fill,
                    height: LEAF_SIZE,
                    overflow: "hidden",
                    position: "absolute",
                  }}
                >
                  <Image
                    source={activeLeafIcon}
                    style={{ width: LEAF_SIZE, height: LEAF_SIZE }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {cropParams && imageURL ? (
          <View style={[styles.cropContainer, {
            width: cropParams.croppedWidth,
            height: cropParams.croppedHeight,
          }]}>
            <Image
              source={{ uri: imageURL }}
              style={{
                width: cropParams.croppedWidth,
                height: cropParams.uncroppedHeight,
                transform: [{ translateY: -cropParams.translateY }],
              }}
            />
          </View>
        ) : null}

        <AppText style={styles.message}>
          {getProgressMessage(progress * 100)}
        </AppText>
      </View>
    </CheckInHeaderFooter>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'HankenGrotesk-Bold',
  },
  leafRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
    gap: 4,
    marginBottom: 24,
  },
  cropContainer: {
    overflow: "hidden",
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 24,
  },
});

export default CheckInAmbientProgress; 