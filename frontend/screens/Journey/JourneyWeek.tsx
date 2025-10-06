import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateTime } from "luxon";
import { collection, getDocs, query, where } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import GradientBG from "../../assets/images/Gradient-BG.png";
import journeyMapIcon from "../../assets/images/journeymap-icon.png";
import { firestore } from "../../firebase";
import { STUDY_ID } from "../../config";
import { NavigationViews } from "../../navigation/AppNavigator";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import { WeekdayName, Workout } from "../../context/plan/WeeklyPlan";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

import AppText from "../../components/AppText";
import PlanWidgetUI from "../../components/PlanWidgetUI";
import JourneySummary from "../../components/journey/JourneySummary";
import LinkWorkoutModal from "../../components/plan/LinkWorkoutModal";
import WorkoutModal from "../../components/plan/WorkoutModal";
import DeleteWorkoutModal from "../../components/plan/DeleteWorkoutModal";
import MissedWorkouts from "../../components/journey/MissedWorkouts";
import UpcomingWorkouts from "../../components/journey/UpcomingWorkouts";
import WorkoutCard from "../../components/workout/WorkoutCard";
import Divider from "../../components/journey/Divider";
import { ChatCard, ChatSessionDoc } from "../../components/journey/ChatCard";
import {
  AmbientDisplayCard,
  AmbientDisplayDoc,
} from "../../components/journey/AmbientDisplayCard";
import CheckInCard from "../../components/CheckInCard";
import SectionHeader from "../../components/journey/SectionHeader";

type JourneyWeekDetailsProps = NativeStackScreenProps<
  NavigationViews,
  "JourneyWeekDetails"
>;

const JourneyWeekDetails: React.FC<JourneyWeekDetailsProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<NavigationViews>>();
  const { week } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { uid, isControl } = useAuth();
  const {
    plansByWeek,
    initialized,
    currentWeekIndex,
    upcomingPlan
  } = usePlan();

  const currentPlan = plansByWeek[week - 1];
  const isCurrentWeek = week === currentWeekIndex + 1;
  const isUpcomingWeek = week > currentWeekIndex + 1;

  const [chatSessions, setChatSessions] = useState<ChatSessionDoc[]>([]);
  const [ambientDocs, setAmbientDocs] = useState<AmbientDisplayDoc[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [shouldRenderModal, setShouldRenderModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutModalType, setWorkoutModalType] = useState<
    "create" | "edit" | "complete"
  >("create");
  const [isLinkingToPlan, setIsLinkingToPlan] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'missed' | 'upcoming' | 'history'>('missed');

  const timelineRef = useRef<View>(null);
  const daysOfWeek: WeekdayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayDotRefs = useRef(daysOfWeek.map(() => React.createRef<View>()));
  const [lineStart, setLineStart] = useState<number | null>(null);
  const [lineEnd, setLineEnd] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<WeekdayName | null>(null);

  useEffect(() => {
    if (!uid) return;

    const fetchChatSessions = async () => {
      try {
        const colRef = collection(
          firestore,
          `studies/${STUDY_ID}/users/${uid}/gpt-messages`
        );
        const snapshot = await getDocs(colRef);
        const sessions: ChatSessionDoc[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          if (!docId.startsWith("session-")) return;
          const isoTime = docId.replace("session-", "");
          const headline = (data.headline as string) ?? "Chat Session";
          const messageCount = Array.isArray(data.messages)
            ? data.messages.length
            : 0;
          if (messageCount <= 1) return;
          sessions.push({ sessionId: docId, headline, iso: isoTime, messageCount });
        });
        sessions.sort(
          (a, b) =>
            DateTime.fromISO(a.iso).toMillis() -
            DateTime.fromISO(b.iso).toMillis()
        );
        setChatSessions(sessions);
      } catch (err) {
        console.error("Error fetching chat sessions:", err);
      }
    };

    const fetchAmbientDocs = async () => {
      try {
        const colRef = collection(
          firestore,
          `studies/${STUDY_ID}/users/${uid}/ambient-display`
        );
        const queryRef = query(colRef, where("gardenGrew", "==", true));
        const snapshot = await getDocs(queryRef);
        const docs: AmbientDisplayDoc[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AmbientDisplayDoc;
          docs.push({
            createdAt: data.createdAt,
            diff: data.diff,
            url: data.url,
            gardenGrew: data.gardenGrew,
          });
        });
        docs.sort(
          (a, b) =>
            DateTime.fromISO(a.createdAt).toMillis() -
            DateTime.fromISO(b.createdAt).toMillis()
        );
        setAmbientDocs(docs);
      } catch (err) {
        console.error("Error fetching ambient docs:", err);
      }
    };

    void fetchChatSessions();
    void fetchAmbientDocs();
  }, [uid]);

  const weekStartDT = useMemo(
    () =>
      currentPlan?.start
        ? DateTime.fromISO(currentPlan.start).startOf("day")
        : DateTime.invalid("Invalid/missing plan start"),
    [currentPlan]
  );
  const weekEndDT = useMemo(
    () =>
      currentPlan?.end
        ? DateTime.fromISO(currentPlan.end).endOf("day")
        : DateTime.invalid("Invalid/missing plan end"),
    [currentPlan]
  );
  const now = DateTime.now();

  const missedWorkouts: Workout[] = [];
  const upcomingWorkouts: Workout[] = [];

  interface HistoryItem {
    type: "workout" | "chat" | "ambient";
    data: Workout | ChatSessionDoc | AmbientDisplayDoc;
    timestamp: DateTime;
  }
  const historyByDay: Record<WeekdayName, HistoryItem[]> = {
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  for (const day in historyByDay) {
    const workouts = currentPlan?.workoutsByDay[day as WeekdayName] || [];
    for (const w of workouts) {
      const startDT = DateTime.fromISO(w.timeStart);
      const finishDT = startDT.plus({ minutes: w.durationMin });
      if (!w.completed) {
        if (finishDT < now) {
          missedWorkouts.push(w);
        } else {
          upcomingWorkouts.push(w);
        }
      } else {
        historyByDay[day as WeekdayName].push({
          type: "workout",
          data: w,
          timestamp: startDT.toLocal(),
        });
      }
    }
  }

  for (const session of chatSessions) {
    const dt = DateTime.fromISO(session.iso).toLocal();
    if (dt >= weekStartDT && dt < weekEndDT) {
      const dayName = dt.toFormat("cccc") as WeekdayName;
      historyByDay[dayName].push({
        type: "chat",
        data: session,
        timestamp: dt,
      });
    }
  }

  for (const doc of ambientDocs) {
    const dt = DateTime.fromISO(doc.createdAt).toLocal();
    if (dt >= weekStartDT && dt < weekEndDT) {
      const dayName = dt.toFormat("cccc") as WeekdayName;
      historyByDay[dayName].push({
        type: "ambient",
        data: doc,
        timestamp: dt,
      });
    }
  }

  for (const day in historyByDay) {
    historyByDay[day as WeekdayName].sort(
      (a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()
    );
  }

  useEffect(() => {
    if (activeTab === 'missed' && missedWorkouts.length === 0) {
      // Switch away from 'missed' if it becomes empty.
      if (upcomingWorkouts.length > 0) {
        setActiveTab('upcoming');
      } else {
        setActiveTab('history');
      }
    }
  }, [activeTab, missedWorkouts, upcomingWorkouts]);

  useEffect(() => {
    if (activeTab === 'upcoming' && upcomingWorkouts.length === 0) {
      // Switch away from 'upcoming' if it becomes empty.
      if (missedWorkouts.length > 0) {
        setActiveTab('missed');
      } else {
        setActiveTab('history');
      }
    }
  }, [activeTab, upcomingWorkouts, missedWorkouts]);

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

  function handleAdd() {
    setWorkoutModalType("create");
    setIsLinkingToPlan(false);
    setShouldRenderModal(true);
    setModalVisible(true);
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

  function handleDelete(w: Workout) {
    setSelectedWorkout(w);
    setPendingDelete(true);
    setModalVisible(false);
  }

  const handleTimelineLayout = () => {
    setTimeout(() => {
      let minY: number | null = null;
      let maxY: number | null = null;
      dayDotRefs.current.forEach((dotRef) => {
        if (dotRef.current) {
          dotRef.current.measureLayout(
            timelineRef.current as View,
            (x: number, y: number, width: number, height: number) => {
              const centerY = y + height / 2;
              if (minY === null || centerY < minY) minY = centerY;
              if (maxY === null || centerY > maxY) maxY = centerY;
            }
          );
        }
      });
      setTimeout(() => {
        if (minY !== null && maxY !== null && maxY > minY) {
          setLineStart(minY);
          setLineEnd(maxY);
        }
      }, 10);
    }, 0);
  };

  const TabButton: React.FC<{
    label: string;
    count?: number;
    isActive: boolean;
    onPress: () => void;
  }> = ({ label, count, isActive, onPress }) => {
    const isEmpty = !count || count === 0;
    const isDisabled = (label === 'Missed' || label === 'Upcoming') && isEmpty;

    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive
            ? {
              backgroundColor:
                label === 'Missed'
                  ? '#FF9500' // Orange for missed
                  : theme.colors.primary,
            }
            : { backgroundColor: 'rgba(0, 0, 0, 0.07)' },
          isDisabled && styles.disabledTab,
        ]}
        onPress={onPress}
        disabled={isDisabled}
      >
        <View style={styles.tabContent}>
          <AppText
            style={[
              styles.tabText,
              { color: isActive ? 'white' : theme.colors.darkGrey },
              isDisabled && { color: theme.colors.darkGrey, opacity: 0.5 },
            ]}
          >
            {label}
          </AppText>
          {count !== undefined && count > 0 && (
            <View
              style={[
                styles.countCircle,
                {
                  backgroundColor: isActive
                    ? 'rgba(255, 255, 255, 0.2)'
                    : label === 'Upcoming'
                      ? 'rgba(52, 199, 89, 0.15)'
                      : 'rgba(255, 149, 0, 0.15)',
                },
              ]}
            >
              <AppText
                style={[
                  styles.countText,
                  {
                    color: isActive
                      ? 'white'
                      : label === 'Upcoming'
                        ? theme.colors.primary
                        : '#FF9500',
                  },
                ]}
              >
                {count}
              </AppText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!initialized) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <ImageBackground source={GradientBG} style={StyleSheet.absoluteFill}>
          <View style={[styles.loadingContainer, { marginTop: insets.top }]}>
            <ActivityIndicator size="large" color="gray" />
            <AppText>Loading Workouts...</AppText>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (!currentPlan) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <ImageBackground source={GradientBG} style={StyleSheet.absoluteFill}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.headerContainer}>
              <AppText style={[styles.primaryHeading, { color: theme.colors.darkGrey }]}>
                Week {week}
              </AppText>
              {isCurrentWeek && week > 1 && (
                <TouchableOpacity
                  style={[
                    styles.seeAllButton,
                    { backgroundColor: theme.colors.tertiary },
                  ]}
                  onPress={() => navigation.navigate("JourneyScreen")}
                >
                  <Image
                    source={journeyMapIcon}
                    style={[
                      styles.journeyIcon,
                      { tintColor: theme.colors.primary },
                    ]}
                  />
                  <AppText
                    style={[
                      styles.seeAllText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    See All Weeks
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
            {isCurrentWeek && week > 1 && <CheckInCard />}
          </ScrollView>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <ImageBackground source={GradientBG} style={StyleSheet.absoluteFill}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          removeClippedSubviews={false}
        >
          <View style={styles.headerContainer}>
            <AppText
              style={[
                styles.primaryHeading,
                { color: theme.colors.darkGrey },
              ]}
            >
              Week {week}
            </AppText>
            {isCurrentWeek && (
              <TouchableOpacity
                style={[
                  styles.seeAllButton,
                  { backgroundColor: theme.colors.tertiary },
                ]}
                onPress={() => navigation.navigate("JourneyScreen")}
              >
                <Image
                  source={journeyMapIcon}
                  style={[
                    styles.journeyIcon,
                    { tintColor: theme.colors.primary },
                  ]}
                />
                <AppText
                  style={[
                    styles.seeAllText,
                    { color: theme.colors.primary },
                  ]}
                >
                  See All Weeks
                </AppText>
              </TouchableOpacity>
            )}
          </View>

          {!isControl && <JourneySummary weekIndex={week} />}

          {isCurrentWeek && !upcomingPlan && <CheckInCard />}

          <Divider />

          <View style={styles.historyHeaderContainer}>
            <SectionHeader title="Weekly Plan" />
            <TouchableOpacity
              style={[
                styles.addButtonContainer,
                { backgroundColor: theme.colors.tertiary },
              ]}
              onPress={handleAdd}
            >
              <AppText
                style={[
                  styles.addButtonText,
                  { color: theme.colors.primary },
                ]}
              >
                Add Activity +
              </AppText>
            </TouchableOpacity>
          </View>

          <PlanWidgetUI
            planStart={currentPlan.start}
            workoutsByDay={currentPlan.workoutsByDay}
          />

          <Divider />

          <SectionHeader title="Activities" />
          <View style={styles.tabContainer}>
            <TabButton
              label="Missed"
              count={missedWorkouts.length}
              isActive={activeTab === 'missed'}
              onPress={() => setActiveTab('missed')}
            />
            <TabButton
              label="Upcoming"
              count={upcomingWorkouts.length}
              isActive={activeTab === 'upcoming'}
              onPress={() => setActiveTab('upcoming')}
            />
            <TabButton
              label="History"
              isActive={activeTab === 'history'}
              onPress={() => setActiveTab('history')}
            />
          </View>

          {activeTab === 'missed' && (
            <MissedWorkouts
              missedWorkouts={missedWorkouts}
              onCompleteWorkout={handleComplete}
              onRescheduleWorkout={handleModify}
              onLinkWorkout={handleLinkToPlan}
            />
          )}

          {activeTab === 'upcoming' && (
            <UpcomingWorkouts
              upcomingWorkouts={upcomingWorkouts}
              forceExpand={isUpcomingWeek}
              onCompleteWorkout={handleComplete}
              onRescheduleWorkout={handleModify}
              onLinkWorkout={handleLinkToPlan}
            />
          )}

          {activeTab === 'history' && Object.values(historyByDay).flat().length > 0 && (
            <>
              <View
                ref={timelineRef}
                style={styles.timelineContainer}
                onLayout={handleTimelineLayout}
                key={JSON.stringify(currentPlan)}
              >
                {lineStart !== null &&
                  lineEnd !== null &&
                  lineEnd > lineStart && (
                    <View
                      style={{
                        position: "absolute",
                        left: 17,
                        width: 2,
                        top: lineStart,
                        height: lineEnd - lineStart,
                        backgroundColor: theme.colors.primary,
                        opacity: 0.33,
                        zIndex: -1,
                      }}
                    />
                  )}

                {daysOfWeek.map((day, dayIndex) => {
                  const dayDate = DateTime.fromISO(currentPlan.start).plus({
                    days: dayIndex,
                  });
                  const dayString = dayDate.toFormat("cccc, LLL d");
                  const items = historyByDay[day] || [];
                  if (items.length === 0) return null;
                  return (
                    <View key={day} style={{ marginVertical: 8 }}>
                      <View style={styles.dayRow}>
                        <View
                          ref={dayDotRefs.current[dayIndex]}
                          style={[
                            styles.dayDot,
                            { backgroundColor: theme.colors.primary },
                          ]}
                        />
                        <AppText
                          style={[
                            styles.dayHeadingText,
                            { color: theme.colors.primary },
                          ]}
                        >
                          {dayString}
                        </AppText>
                      </View>
                      {items.map((item, itemIndex) => {
                        if (item.type === "workout") {
                          const workout = item.data as Workout;
                          return (
                            <WorkoutCard
                              key={JSON.stringify(workout)}
                              workout={workout}
                              onComplete={() =>
                                handleComplete(workout)
                              }
                              onReschedule={() =>
                                handleModify(workout)
                              }
                              onLinkToPlan={() =>
                                handleLinkToPlan(workout)
                              }
                            />
                          );
                        } else if (item.type === "chat") {
                          const sessionData = item.data as ChatSessionDoc;
                          return (
                            <ChatCard
                              key={`chat-${itemIndex}`}
                              headline={sessionData.headline}
                              iso={sessionData.iso}
                              sessionId={sessionData.sessionId}
                              messageCount={sessionData.messageCount}
                              onPress={() =>
                                navigation.navigate("ChatHistoryScreen", {
                                  sessionId: sessionData.sessionId,
                                })
                              }
                            />
                          );
                        } else if (item.type === "ambient") {
                          const ambientData = item.data as AmbientDisplayDoc;
                          return (
                            <AmbientDisplayCard
                              key={`ambient-${itemIndex}`}
                              diff={ambientData.diff}
                              url={ambientData.url}
                              createdAt={ambientData.createdAt}
                              gardenGrew={ambientData.gardenGrew}
                            />
                          );
                        }
                        return null;
                      })}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {modalVisible && selectedWorkout && isLinkingToPlan && (
            <LinkWorkoutModal
              visible={modalVisible}
              selectedWorkout={selectedWorkout}
              onCancel={cancelModal}
              onConfirm={() => confirmLink()}
              weekIndex={week - 1}
            />
          )}

          {shouldRenderModal && (
            <WorkoutModal
              visible={modalVisible}
              mode={workoutModalType}
              restrictionType="none"
              onClose={() => {
                setModalVisible(false);
                setSelectedDay(null);
              }}
              onDelete={(workout: Workout) => {
                handleDelete(workout);
              }}
              onConfirm={() => {
                setModalVisible(false);
                setSelectedDay(null);
              }}
              onModalHide={() => {
                if (pendingDelete) {
                  setDeleteModalVisible(true);
                  setPendingDelete(false);
                }
                setShouldRenderModal(false);
              }}
              forceDay={
                selectedDay && weekStartDT
                  ? weekStartDT
                    .plus({ days: daysOfWeek.indexOf(selectedDay) })
                    .toISODate()
                  : null
              }
              plan={currentPlan}
              {...(workoutModalType !== "create" &&
                selectedWorkout && { existingWorkout: selectedWorkout })}
            />
          )}

          {selectedWorkout && deleteModalVisible && (
            <DeleteWorkoutModal
              workout={selectedWorkout}
              plan={currentPlan}
              visible={deleteModalVisible}
              onClose={() => setDeleteModalVisible(false)}
            />
          )}
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default JourneyWeekDetails;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 8,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noPlanContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  primaryHeading: {
    fontSize: 24,
    fontWeight: "bold",
    paddingLeft: 12,
  },
  secondaryHeading: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 10,
    paddingLeft: 12,
  },
  tertiaryHeading: {
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 4,
    paddingLeft: 12,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 20,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15,
    gap: 6,
  },
  journeyIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  seeAllText: {
    fontSize: 14,
  },
  historyHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
  },
  addButtonContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15,
  },
  addButtonText: {
    fontSize: 14,
  },
  timelineContainer: {
    position: "relative",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    marginBottom: 4,
  },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    zIndex: 1,
  },
  dayHeadingText: {
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disabledTab: {
    opacity: 0.5,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
    marginHorizontal: 16,
  },
});
