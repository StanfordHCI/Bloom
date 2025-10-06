import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import AppText from "../AppText";
import { WeekdayName, WeeklyPlan, Workout } from "../../context/plan/WeeklyPlan";
import { useTheme } from "../../context/ThemeContext";
import { workoutTypeToSFSymbol } from "../../healthkit/workoutTypes";
import WorkoutModal from "../plan/WorkoutModal";
import { DateTime } from "luxon";

interface EditPlanControlProps {
  week: number;
  daysOfWeek: string[];
  plan: WeeklyPlan;
  setPlan: (plan: WeeklyPlan) => void;
  onDone?: () => void;
}

const EditPlanControl: React.FC<EditPlanControlProps> = ({
  daysOfWeek,
  plan,
  setPlan,
  onDone,
}) => {
  const { theme } = useTheme();
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [addModalDay, setAddModalDay] = useState<WeekdayName | null>(null);

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // returns ISO of the next day of provided weekday
  function getNextWeekdayIso(weekday: string): string | null {
    const weekdays: { [key: string]: number } = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7,
    };

    const targetWeekday = weekdays[weekday.toLowerCase()];
    if (!targetWeekday) {
      console.warn(`Invalid weekday provided: ${weekday}`);
      return null;
    }

    let candidate = DateTime.fromISO(plan.start);
    const end = DateTime.fromISO(plan.end);

    while (candidate <= end) {
      if (candidate.weekday === targetWeekday) {
        return candidate.toISO();
      }
      candidate = candidate.plus({ days: 1 });
    }
    // Instead of throwing an error, return null if no matching day is found.
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
        </View>
        <ScrollView
          horizontal={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {daysOfWeek.map((day) => {
            const isoDate = getNextWeekdayIso(day);
            // If no valid date is returned, skip rendering this day's card.
            if (!isoDate) return null;
            // If the day is before today, skip rendering this day's card.
            const dayStart = DateTime.fromISO(isoDate).startOf('day')
            const minDateStart = DateTime.fromJSDate(new Date()).startOf('day')
            if (dayStart < minDateStart) return null;

            return (
              <View key={day} style={[styles.dayCard, { backgroundColor: 'rgba(255, 255, 255, 0.5)' }]}>
                <View style={styles.dayHeader}>
                  <AppText style={[styles.dayText, { color: '#000000' }]}>
                    {day}, {DateTime.fromISO(isoDate).toFormat('LLL d')}
                  </AppText>
                  <AppText style={[styles.totalTime, { color: '#86868B' }]}>
                    {plan.workoutsByDay[day as WeekdayName]?.reduce((acc, w) => acc + w.durationMin, 0)}min
                  </AppText>
                </View>

                {plan.workoutsByDay[day as WeekdayName]?.map((workout, index) => (
                  <View key={index} style={styles.workoutRow}>
                    <AppText style={[styles.workoutType, { color: theme.colors.primary, fontWeight: '500' }]}>
                      {capitalizeFirst(workout.type)}
                    </AppText>
                    <View style={styles.iconRow}>
                      <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                        <SFSymbol
                          name={workoutTypeToSFSymbol(workout.type)}
                          weight="semibold"
                          scale="medium"
                          color={theme.colors.secondary}
                          style={styles.workoutIcon}
                        />
                      </View>
                      <View style={styles.workoutDetails}>
                        <AppText style={[styles.duration, { color: '#86868B' }]}>
                          {Math.round(workout.durationMin)}min
                        </AppText>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedWorkout(workout)}
                        style={[styles.modifyButton, { backgroundColor: '#F2F2F7' }]}
                      >
                        <SFSymbol
                          name="pencil"
                          weight="semibold"
                          scale="medium"
                          color="#3C3C43"
                          style={styles.editIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setAddModalDay(day as WeekdayName)}
                >
                  <SFSymbol
                    name="plus"
                    weight="semibold"
                    color={theme.colors.primary}
                    style={styles.addIcon}
                  />
                  <AppText style={[styles.addText, { color: theme.colors.primary }]}>
                    Add
                  </AppText>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={onDone}
        >
          <AppText style={styles.buttonText}>
            Confirm plan
          </AppText>
        </TouchableOpacity>
      </View>
      {selectedWorkout && (
        <WorkoutModal
          mode="edit"
          restrictionType="planCreation"
          plan={plan}
          visible={!!selectedWorkout}
          existingWorkout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onConfirm={(plan: WeeklyPlan) => {setPlan(plan); setSelectedWorkout(null)}}
        />
      )}

      {addModalDay && (
        <WorkoutModal
          mode="create"
          restrictionType="planCreation"
          plan={plan}
          visible={!!addModalDay}
          onClose={() => setAddModalDay(null)}
          onConfirm={(plan: WeeklyPlan) => {setPlan(plan); setAddModalDay(null)}}
          forceDay={getNextWeekdayIso(addModalDay)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    marginBottom: 16,
  },
  scrollContainer: {
    paddingHorizontal: 0,
    gap: 12,
    paddingBottom: 80, // Add padding to prevent content from being hidden behind footer
  },
  dayCard: {
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#86868B',
  },
  dayText: {
    fontSize: 20,
    fontFamily: "HankenGrotesk-SemiBold",
  },
  totalTime: {
    fontSize: 17,
    fontFamily: "HankenGrotesk-Regular",
  },
  workoutRow: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#86868B',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutIcon: {
    width: 22,
    height: 22,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutType: {
    marginBottom: 2,
  },
  duration: {
    fontSize: 15,
    fontFamily: "HankenGrotesk-Regular",
  },
  modifyButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    width: 18,
    height: 18,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  modifyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addIcon: {
    width: 20,
    height: 20,
  },
  addText: {
    fontSize: 17,
    fontFamily: "HankenGrotesk-Regular",
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "HankenGrotesk-SemiBold",
    fontWeight: 'bold',
  },
  footer: {
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'HankenGrotesk-SemiBold',
  }
});

export default EditPlanControl;
