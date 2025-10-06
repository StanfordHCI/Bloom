import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import { useTheme } from "../context/ThemeContext";
import { DateTime } from "luxon";
import AppText from "../components/AppText";
import captureError from "../utils/errorHandling";
import { STUDY_ID } from "../config";
import { useCheckIn } from "../context/CheckInContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RescheduleCheckIn: React.FC = () => {
  const { uid } = useAuth();
  const { currentPlan, upcomingPlan, loading } = usePlan();
  const { theme } = useTheme();
  const { nextStepFrom } = useCheckIn();

  const [oldCheckIn, setOldCheckIn] = useState<Date | null>(null);
  const [pickedDate, setPickedDate] = useState<Date>(new Date());
  const [pickerTouched, setPickerTouched] = useState(false);
  const [minDate, setMinDate] = useState<Date>(new Date());
  const [maxDate, setMaxDate] = useState<Date>(new Date());
  const [dateError, setDateError] = useState<string | null>(null);

  // If currentPlan is null, but upcomingPlan exists, we use upcomingPlan as the reference for scheduling
  const planForScheduling = upcomingPlan ?? currentPlan;

  useEffect(() => {
    if (!uid) return;
    const fetchOldCheckIn = async () => {
      try {
        const docRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
        const snap = await getDoc(docRef);
        const data = snap.data();
        if (data?.checkinTime) {
          if (typeof data.checkinTime === "string" || typeof data.checkinTime === "number") {
            setOldCheckIn(new Date(data.checkinTime));
          } else {
            console.error("Invalid checkinTime format:", data.checkinTime);
          }
        }
      } catch (err) {
        console.error("Failed to fetch old checkinTime:", err);
      }
    };
    void fetchOldCheckIn();
  }, [uid]);

  useEffect(() => {
    if (loading) return;

    if (planForScheduling) {
      // plan ends on Sat => allow Fri->Sun
      const planEnd = DateTime.fromISO(planForScheduling.end)
      const friday = planEnd.minus({ days: 1 }).startOf("day");
      const min = DateTime.now() > friday ? DateTime.now() : friday;
      const sunday = planEnd.plus({ days: 1 }).endOf("day");

      setMinDate(min.toJSDate());
      setMaxDate(sunday.toJSDate());
    } else {
      // no plan => next 2 weeks
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

  const handleConfirm = async () => {
    if (!uid || !pickedDate) return;
    if (dateError) return;
    try {
      await updateDoc(doc(firestore, `studies/${STUDY_ID}/users/${uid}`), {
        checkinTime: pickedDate.toISOString(),
      });
      void nextStepFrom("RescheduleCheckIn");
    } catch (err) {
      captureError(err, "Failed to update check-in time");
    }
  };

  let instructions = "";
  if (planForScheduling) {
    // Plan ends on Saturday => we encourage check-in before that Sunday
    const planEnd = DateTime.fromISO(planForScheduling.end);
    const sundayAfter = planEnd.plus({ days: 1 }).toLocaleString(DateTime.DATE_MED);
    instructions = `To stay on track with your current plan, schedule your check-in before ${sundayAfter}.`;
  } else {
    instructions = "To stay on track, please schedule your check-in at your earliest convenience.";
  }
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={[theme.onboarding.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
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
          <View style={theme.onboarding.topSection}>
            <AppText variant="h1" style={{ width: '100%' }}>
              Reschedule Check-In
            </AppText>
          </View>
          <View style={theme.onboarding.middleSection}>
            <DateTimePicker
              value={pickedDate}
              mode="datetime"
              display="spinner"
              onChange={onDateTimeChange}
              minimumDate={minDate}
              maximumDate={maxDate}
            />

            <AppText style={{ marginTop: 20, marginBottom: 20, flexWrap: 'wrap' }}>{instructions}</AppText>

            {dateError && (
              <Text style={{ color: "red", marginTop: 10, textAlign: "center" }}>
                {dateError}
              </Text>
            )}

            {oldCheckIn && (
              <Text style={{ marginBottom: 10, width: '100%', textAlign: 'left' }}>
                Old Check-In: {oldCheckIn.toLocaleString()}
              </Text>
            )}

            {!dateError && pickerTouched && (
              <Text style={{ color: theme.colors.primary, marginTop: 10, width: '100%', textAlign: 'left' }}>
                New Check-In: {pickedDate.toLocaleString()}
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
            onPress={() => void handleConfirm()}
            disabled={!pickerTouched || !!dateError}
          >
            <Text
              style={[theme.onboarding.button.text, { fontSize: 18 }]}
              numberOfLines={1}
            >
              Confirm
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
  dismissButton: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    zIndex: 1,
    padding: 8,
  },
  dismissBar: {
    width: 36,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 2.5,
  }
});

export default RescheduleCheckIn;
