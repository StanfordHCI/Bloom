import React, {
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  View,
  Switch,
  StyleSheet,
  TextInput
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Dropdown } from "react-native-element-dropdown";
import AppText from "../AppText";
import { DateTime } from "luxon";
import { Workout } from "../../context/plan/WeeklyPlan";
import {
  WorkoutType,
  WorkoutTypes,
  workoutTypeToSFSymbol,
} from "../../healthkit/workoutTypes";
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../../context/ThemeContext";

// Helper to convert a string to Title Case.
function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (text: string) =>
    text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

function calculateMinimumDate(planStart: string, restrictionType: string) {
  const now = DateTime.now();
  const planStartDt = DateTime.fromISO(planStart);
  if (restrictionType === "none") return planStartDt.startOf('day').toJSDate();
  if (now < planStartDt) return planStartDt.startOf('day').toJSDate();
  return now.startOf('day').toJSDate();
}

interface WorkoutFormProps {
  workout: Workout;
  onChange: (updatedWorkout: Workout) => void;
  forceDay?: string | null;
  planStart: string;
  planEnd: string;
  restrictionType: "none" | "planCreation";
  mode: "create" | "edit" | "complete";
}

const WorkoutForm = forwardRef(function WorkoutForm(
  {
    workout,
    onChange,
    forceDay,
    planStart,
    planEnd,
    restrictionType,
    mode,
  }: WorkoutFormProps,
  ref
) {
  const { theme } = useTheme();

  // Local state for hours/minutes text
  const [hoursText, setHoursText] = useState(
    String(Math.floor(workout.durationMin / 60))
  );
  const [minutesText, setMinutesText] = useState(
    String(workout.durationMin % 60)
  );

  // Normalize hours/mins (e.g., 90min => 1h 30min) on blur
  function convertDurationToHoursMins() {
    let h = parseInt(hoursText) || 0;
    let m = parseInt(minutesText) || 0;
    h += Math.floor(m / 60);
    m = m % 60;
    setHoursText(String(h));
    setMinutesText(String(m));
  }

  // Parent calls this before confirmation
  function getFinalDuration(): number {
    let h = parseInt(hoursText) || 0;
    let m = parseInt(minutesText) || 0;
    // final normalization
    h += Math.floor(m / 60);
    m = m % 60;
    return h * 60 + m;
  }

  // Expose to parent
  useImperativeHandle(ref, () => ({
    getFinalDuration,
  }));

  const updateField = (field: keyof Workout, value: string | number | boolean) => {
    const updatedWorkout = { ...workout, [field]: value };
    onChange(updatedWorkout);
  };

  // Convert an ISO string to a JS Date without timezone adjustments.
  const toJSDateNoTZ = (iso: string) => {
    const dt = DateTime.fromISO(iso);
    return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second);
  };

  const handleTimeChange = (event: DateTimePickerEvent, newDate?: Date) => {
    if (newDate) {
      let dt = DateTime.fromJSDate(newDate).toLocal();
      if (forceDay) {
        const forced = DateTime.fromISO(forceDay);
        dt = forced.set({
          hour: dt.hour,
          minute: dt.minute,
          second: dt.second,
          millisecond: dt.millisecond,
        });
      }
      updateField("timeStart", dt.toISO() ?? workout.timeStart);
    }
  };

  const minimumDate = calculateMinimumDate(planStart, restrictionType);
  const maximumDate = DateTime.fromISO(planEnd).endOf('day').toJSDate();

  return (
    <View style={styles.formContainer}>

      {/* Workout Type */}
      <View style={styles.row}>
        <AppText style={styles.fieldLabel}>Type</AppText>
        <View style={styles.inputContainer}>
          <Dropdown
            autoScroll={false}
            style={styles.dropdown}
            data={WorkoutTypes.map((type) => {
              const lowerType = type.toLowerCase();
              const label = toTitleCase(type);
              const searchText =
                lowerType === "functional strength training"
                  ? `${label.toLowerCase()} weightlifting`
                  : label.toLowerCase();
              return { label, value: type, search: searchText };
            })}
            labelField="label"
            valueField="value"
            searchField="search"
            value={workout.type}
            search
            searchPlaceholder="Search workout type..."
            renderLeftIcon={() => (
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.colors.tertiary },
                ]}
              >
                <SFSymbol
                  name={workoutTypeToSFSymbol(workout.type)}
                  weight="semibold"
                  scale="medium"
                  color={theme.colors.primary}
                  style={styles.workoutIcon}
                />
              </View>
            )}
            renderItem={(item: { label: string; value: string }) => (
              <View
                style={{ flexDirection: "row", alignItems: "center", padding: 10 }}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.colors.tertiary },
                  ]}
                >
                  <SFSymbol
                    name={workoutTypeToSFSymbol(item.value)}
                    weight="semibold"
                    scale="medium"
                    color={theme.colors.primary}
                    style={styles.workoutIcon}
                  />
                </View>
                <AppText>{item.label}</AppText>
              </View>
            )}
            onChange={(item: { value: string }) =>
              updateField("type", item.value.toLowerCase() as WorkoutType)
            }
          />
        </View>
      </View>

      {/* Duration */}
      <View style={styles.row}>
        <AppText style={styles.fieldLabel}>Duration</AppText>
        <View style={[styles.inputContainer, styles.durationRow]}>
          <TextInput
            style={styles.durationInput}
            keyboardType="numeric"
            value={hoursText}
            onChangeText={(val) => setHoursText(val.replace(/\D/g, ""))}
            onEndEditing={convertDurationToHoursMins}
          />
          <AppText style={styles.durationLabel}>hr</AppText>

          <TextInput
            style={styles.durationInput}
            keyboardType="numeric"
            value={minutesText}
            onChangeText={(val) => setMinutesText(val.replace(/\D/g, ""))}
            onEndEditing={convertDurationToHoursMins}
          />
          <AppText style={styles.durationLabel}>min</AppText>
        </View>
      </View>

      {/* Date */}
      <View style={styles.row}>
        <AppText style={styles.fieldLabel}>Date</AppText>
        <View style={styles.inputContainer}>
          {forceDay ? (
            <AppText style={{ marginRight: 8 }}>
              {DateTime.fromISO(forceDay).toLocaleString({
                weekday: "short",
                month: "short",
                day: "2-digit",
              })}
            </AppText>
          ) : (
            <DateTimePicker
              style={{
                alignSelf: "flex-start",
                marginLeft: -30,
                paddingLeft: 20,
              }}
              value={toJSDateNoTZ(workout.timeStart)}
              mode="date"
              onChange={handleTimeChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </View>
      </View>

      {/* Time */}
      <View style={styles.row}>
        <AppText style={styles.fieldLabel}>Time</AppText>
        <View style={styles.inputContainer}>
          <DateTimePicker
            style={{
              alignSelf: "flex-start",
              marginLeft: -30,
              paddingLeft: 20,
            }}
            value={toJSDateNoTZ(workout.timeStart)}
            mode="time"
            onChange={handleTimeChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        </View>
      </View>

      {/* Intensity */}
      <View style={styles.row}>
        <AppText style={styles.fieldLabel}>Intensity</AppText>
        <View style={styles.inputContainer}>
          <Dropdown
            style={styles.dropdown}
            data={["light", "moderate", "vigorous"].map((intensity) => ({
              label: toTitleCase(intensity),
              value: intensity,
            }))}
            labelField="label"
            valueField="value"
            value={workout.intensity}
            onChange={(item: { value: string }) =>
              updateField("intensity", item.value.toLowerCase())
            }
          />
        </View>
      </View>

      {/* Completed? */}
      {mode !== "complete" &&
        restrictionType !== "planCreation" &&
        (workout.healthKitWorkoutData?.length ?? 0) === 0 && (
          <View style={styles.row}>
            <AppText style={styles.fieldLabel}>Completed?</AppText>
            <View style={styles.inputContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <AppText
                  style={[
                    { marginRight: 8 },
                    workout.completed
                      ? { color: theme.colors.primary }
                      : { color: theme.colors.darkGrey },
                  ]}
                >
                  {workout.completed ? "Yes" : "No"}
                </AppText>
                <Switch
                  value={workout.completed}
                  onValueChange={(value) => updateField("completed", value)}
                  trackColor={{
                    true: theme.colors.primary,
                    false: theme.colors.inactiveLight,
                  }}
                />
              </View>
            </View>
          </View>
        )}
    </View>
  );
});

const styles = StyleSheet.create({
  formContainer: {
    flexDirection: "column",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  fieldLabel: {
    minWidth: 100,
    marginRight: 8,
    fontSize: 16,
    fontWeight: "400",
  },
  inputContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  dropdown: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F2F2F2",
    maxWidth: 200,
  },
  workoutIcon: {
    width: 22,
    height: 22,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationInput: {
    width: 52,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#F2F2F2",
    textAlign: "center",
    fontSize: 16,
    marginRight: 4,
  },
  durationLabel: {
    marginHorizontal: 4,
  },
});

export default WorkoutForm;
