import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { STUDY_ID } from "../config";
import captureError from "../utils/errorHandling";
import AppText from "../components/AppText";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import { DateTime } from "luxon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScheduleCheckInProps {
  onNext: (nextStep: string) => void;
}

const ScheduleCheckIn: React.FC<ScheduleCheckInProps> = ({onNext}) => {
  const { uid } = useAuth();
  const { theme } = useTheme();
  const { currentPlan, upcomingPlan, loading } = usePlan();
  const insets = useSafeAreaInsets();

  const [pickedDate, setPickedDate] = useState<Date>(new Date());
  const [pickerTouched, setPickerTouched] = useState(false);
  const [minDate, setMinDate] = useState<Date>(new Date());
  const [maxDate, setMaxDate] = useState<Date>(new Date());
  const [dateError, setDateError] = useState<string | null>(null);

  // If currentPlan is null, but upcomingPlan exists, we use upcomingPlan as the reference for scheduling
  const planForScheduling = upcomingPlan ?? currentPlan;

  useEffect(() => {
    if (loading) return;

    if (planForScheduling) {
      // Plan found => schedule check-in Fri->Sun
      const planEnd = DateTime.fromISO(planForScheduling.end);
      const friday = planEnd.minus({ days: 1 }).startOf("day");
      const min = DateTime.now() > friday ? DateTime.now() : friday;
      const sunday = planEnd.plus({ days: 1 }).endOf("day");

      setMinDate(min.toJSDate());
      setMaxDate(sunday.toJSDate());
    } else {
      // No plan => anytime in next 2 weeks
      const now = DateTime.now();
      setMinDate(now.toJSDate());
      setMaxDate(now.plus({ days: 14 }).endOf("day").toJSDate());
    }
  }, [planForScheduling, loading]);

  const onDateTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "set" && date) {
      setPickerTouched(true);
      setPickedDate(date);
    }
  };

  useEffect(() => {
    if (!pickerTouched) {
      setDateError(null);
      return;
    }
    if (pickedDate < minDate) {
      setDateError(`Please pick a time after ${minDate.toLocaleString()}.`);
    } else if (pickedDate > maxDate) {
      setDateError(`Please pick a time before ${maxDate.toLocaleString()}.`);
    } else {
      setDateError(null);
    }
  }, [pickedDate, minDate, maxDate, pickerTouched]);

  const handleConfirmSchedule = async () => {
    if (!uid || !pickedDate) return;
    if (dateError) return;
    try {
      await updateDoc(doc(firestore, `studies/${STUDY_ID}/users/${uid}`), {
        checkinTime: pickedDate.toISOString(),
      });
      void onNext("ScheduleCheckIn");
    } catch (err) {
      captureError(err, "Failed to update check-in time");
    }
  };

  if (loading) {
    return (
      <View style={[theme.onboarding.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  let rangeText = "";
  if (planForScheduling) {

    const planEnd = DateTime.fromISO(planForScheduling.end);
    const fri = planEnd.minus({ days: 1 }).startOf("day").toJSDate();
    const sun = planEnd.plus({ days: 1 }).endOf("day").toJSDate();

    rangeText =
      `Your plan ends on ${planEnd.toJSDate().toDateString()}, so let's schedule your next check-in between ${fri.toDateString()} and ${sun.toDateString()}.\n\n Please select a time that works for you below.`;
  } else {
    rangeText =
      "You don't currently have an active physical activity plan. Please schedule a check-in conversation at your earliest convenience so we can create one together.";
  }

  return (
    <View style={{
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      backgroundColor: 'white',
      flex: 1,
    }}>
      <View style={[theme.onboarding.container, styles.container]}>
        <ScrollView style={styles.scrollContent}>
          <View style={[theme.onboarding.topSection]}>
            <AppText variant="h1" style={{ width: '100%' }}>
              Schedule Your Next Check-In
            </AppText>
          </View>

          <View style={[theme.onboarding.middleSection]}>
            <AppText style={{ marginBottom: 20 }}>{rangeText}</AppText>
            <DateTimePicker
              value={pickedDate}
              mode="datetime"
              display="spinner"
              onChange={onDateTimeChange}
              minimumDate={minDate}
              maximumDate={maxDate}
            />
            {dateError && <Text style={styles.errorText}>{dateError}</Text>}
            {!dateError && pickerTouched && (
              <Text style={{ color: theme.colors.primary, marginTop: 10 }}>
                Chosen Check-In: {pickedDate.toLocaleString()}
              </Text>
            )}
          </View>
        </ScrollView>
        <View style={{
          marginTop: 10,
        }}>
          <TouchableOpacity
            style={[
              {
                paddingVertical: 16,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                borderRadius: 20,
                backgroundColor: theme.colors.primary,
                opacity: pickerTouched && !dateError ? 1 : 0.5,
                minHeight: 60,
              },
            ]}
            onPress={() => void handleConfirmSchedule()}
            disabled={!pickerTouched || !!dateError}
          >
            <Text 
              style={[theme.onboarding.button.text, { fontSize: 18 }]}
              numberOfLines={1}
            >
              Schedule Check-In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  footer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    marginTop: 10,
    borderTopColor: '#F0F0F0',
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    marginTop: 10,
    textAlign: "center",
  },
});

export default ScheduleCheckIn;
