import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View, ImageBackground, Dimensions } from "react-native";
import TimeFilterTabs from "../../components/insights/TimeFilterTabs";
import React from "react";
import InsightsSummary from "../../components/insights/InsightsSummary";
import HealthKitChart from "../../components/visualization/HealthKitChart";
import { DateTime } from "luxon";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import { useAvailableSampleTypes } from "../../healthkit/useAvailableSampleTypes";
import AppText from "../../components/AppText";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import GradientBG from "../../assets/images/Gradient-BG.png";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SampleType } from "../../healthkit/sampleTypes";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const useDateRange = (
  selectedTab: "Day" | "Week" | "Overall",
  currentDate: DateTime
) => {
  const [dateRange, setDateRange] = useState({
    start: currentDate.startOf("day"),
    end: currentDate.endOf("day"),
  });
  const { programStartDate } = usePlan();

  useEffect(() => {
    if (selectedTab === "Day") {
      setDateRange({
        start: currentDate.startOf("day"),
        end: currentDate.endOf("day"),
      });
    } else if (selectedTab === "Week") {
      const startOfWeek =
        currentDate.weekdayShort === 'Sun'
          ? currentDate.startOf('day')
          : currentDate.startOf('week').minus({ days: 1 }).startOf('day');
      const endOfWeek = startOfWeek.plus({ days: 6 }).endOf('day');
      setDateRange({
        start: startOfWeek,
        end: endOfWeek,
      });
    } else {
      if (!programStartDate) {
        console.error("Program start date is not set");
        return;
      }
      setDateRange({
        start: DateTime.fromJSDate(programStartDate).startOf("day"),
        end: currentDate.endOf("day"),
      });
    }
  }, [selectedTab, currentDate, programStartDate]);

  return dateRange;
};

const InsightsScreen = () => {
  const { theme } = useTheme();
  const { isControl } = useAuth();

  const [selectedTab, setSelectedTab] = useState<"Day" | "Week" | "Overall">("Day");
  const currentDateRef = useRef(DateTime.now());
  const currentDate = currentDateRef.current;

  const stableStartDate = useMemo(() => DateTime.now().minus({ months: 1 }), []);
  const stableEndDate = useMemo(() => DateTime.now(), []);

  const insets = useSafeAreaInsets();

  const { loading, availableSampleTypes, unavailableSampleTypes } =
    useAvailableSampleTypes({
      startDate: stableStartDate,
      endDate: stableEndDate,
    });


  const [showEmptyDataSources, setShowEmptyDataSources] = useState(false);

  const handleTabChange = (tab: string) => {
    if (tab === "Day" || tab === "Week" || tab === "Overall") {
      setSelectedTab(tab);
    } else {
      console.error("Invalid tab selected");
    }
  };

  const { start, end } = useDateRange(selectedTab, currentDate);

  // The final order we want to display the sample types in
  const finalOrderedTypes: SampleType[] = [
    "stepCount",
    "distanceWalkingRunning",
    "workout",
    "appleExerciseTime",
    "appleMoveTime",
    "appleStandTime",
    "sleepAnalysis",
    "heartRate",
    "restingHeartRate",
    "heartRateVariabilitySDNN",
    "walkingHeartRateAverage",
  ];

  // Filter or not, based on the toggle
  const displayedSampleTypes = showEmptyDataSources
    ? finalOrderedTypes // All 
    : finalOrderedTypes.filter((t) => availableSampleTypes.includes(t)); // Only those with data

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "white" }}>
      <ImageBackground
        source={GradientBG}
        style={styles.absoluteFill}
      >
        <ScrollView style={[
          styles.container,
          { marginBottom: insets.bottom + insets.top + 48}
        ]}>
          <TimeFilterTabs onTabChange={handleTabChange} />

          {!isControl && (
            <InsightsSummary
              currentTab={selectedTab}
              currentDate={currentDate}
              dateRange={{ start, end }}
            />
          )}

          {/* If we're still checking, display a loader */}
          {loading && (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
          )}

          {/* If no sample types had data and we're not showing empties, show fallback text */}
          {!loading && availableSampleTypes.length === 0 && !showEmptyDataSources && (
            <View style={{ display: "flex", alignItems: "center" }}>
              <AppText variant="p" style={{ marginTop: 16 }}>
                No data found
              </AppText>
            </View>
          )}

          {/* Render charts for each displayed sample type */}
          {!loading && displayedSampleTypes.map((type) => (
            <React.Fragment key={type}>
              {selectedTab === "Day" && (
                <HealthKitChart
                  key={`${start.toISO()}-${end.toISO()}`}
                  sampleType={type}
                  initialAggregationLevel="day"
                  showInsights={!isControl}
                  collapsible={true}
                />
              )}

              {selectedTab === "Week" && (
                <HealthKitChart
                  key={`${start.toISO()}-${end.toISO()}`}
                  sampleType={type}
                  initialAggregationLevel="week"
                  showInsights={!isControl}
                  collapsible={true}
                />
              )}

              {selectedTab === "Overall" && (
                <HealthKitChart
                  key={`${start.toISO()}-${end.toISO()}`}
                  sampleType={type}
                  startDate={start}
                  endDate={end}
                  showInsights={!isControl}
                  collapsible={true}
                  initialAggregationLevel={type === "sleepAnalysis" ? "week" : 'day'}
                />
              )}
            </React.Fragment>
          ))}

          {/* Toggle button to show or hide empty data sources (only if data check is done) */}
          {!loading && unavailableSampleTypes.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowEmptyDataSources(!showEmptyDataSources)}
              style={{ marginVertical: 8, display: "flex", alignItems: "center" }}
            >
              <AppText
                variant="h3"
                style={{ color: theme.colors.primary }}
              >
                {showEmptyDataSources ? "Hide empty data sources" : "Show empty data sources"}
              </AppText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16
  },
  absoluteFill: {
    position: "absolute",
    width: screenWidth,
    height: screenHeight,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
});

export default InsightsScreen;
