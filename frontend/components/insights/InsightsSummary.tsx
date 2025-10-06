import React, { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, Image, StyleSheet, View, TouchableOpacity } from "react-native";
import { DateTime } from "luxon";
import Card from "../Card";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import AppText from "../AppText";

import { sampleTypes, SampleType } from "../../healthkit/sampleTypes";
import { HealthKitData, HealthKitModule, HealthKitParameters } from "../../healthkit/HealthKitModule";
import { computeSummaryStats, getDataSourceDescription } from "../../healthkit/formatHealthKitSummary";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { BACKEND_URL } from "../../config";
import beeIcon from "../../assets/images/Bee.png";
import { SFSymbol } from "react-native-sfsymbols";

interface InsightsSummaryProps {
  currentTab: "Day" | "Week" | "Overall";
  currentDate: DateTime;
  dateRange: { start: DateTime; end: DateTime };
}

interface InsightsSummaryResponse {
  summary: string;
}

function buildInsightsSummaryText(
  startDate: DateTime,
  endDate: DateTime,
  data: Record<SampleType, HealthKitData[]>
): string {
  const rangeLabel = `${startDate.toFormat("yyyy-LL-dd")} to ${endDate.toFormat("yyyy-LL-dd")}`;

  let summary = `Summary of all available data sources for the period: ${rangeLabel}\n\n`;

  // For each sample type in alphabetical order (optional)
  const sortedTypes = Object.keys(data).sort() as SampleType[];
  for (const sampleType of sortedTypes) {
    const hkArray = data[sampleType];

    const desc = getDataSourceDescription(sampleType);
    const stats = computeSummaryStats(hkArray);

    summary += `
=== Sample Type: ${sampleType} ===
Data Source Description:
${desc}

Summary Stats:
${stats}
------------------------------------------
`.trim();

    summary += "\n\n"; // spacing before next block
  }

  return summary.trim();
}

const InsightsSummary: React.FC<InsightsSummaryProps> = ({
  currentTab,
  currentDate,
  dateRange
}) => {
  const { theme } = useTheme();
  const { currentPlan } = usePlan();
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { authToken } = useAuth();

  const [collapsed, setCollapsed] = useState(true);
  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);

    if (!authToken) {
      setSummary("No summary data available.");
      setIsLoading(false);
      return;
    }

    try {
      // Prepare an object to hold raw HealthKit arrays for each sampleType
      const allData: Record<SampleType, HealthKitData[]> = {} as Record<SampleType, HealthKitData[]>;
      // 1) Query each sample type in the given date range
      for (const type of sampleTypes) {
        const params: HealthKitParameters = {
          sample_type: type,
          start_date: dateRange.start.toISO() ?? "",
          end_date: dateRange.end.toISO() ?? "",
          interval: "day",
        };

        try {
          const results = await HealthKitModule.query(params);
          // Store the FULL HealthKitData array:
          allData[type] = results;
        } catch (err) {
          console.error(`Error fetching HealthKit data for ${type}:`, err);
          allData[type] = [];
        }
      }

      // 2) Build a client-side text summary using all sample data
      const summaryText = buildInsightsSummaryText(dateRange.start, dateRange.end, allData);

      // 3) POST that summaryText to the backend
      const resp = await axios.post<InsightsSummaryResponse>(
        `${BACKEND_URL}/summary/insights`,
        { summaryText },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 60000,
        }
      );

      if (resp.data?.summary) {
        setSummary(resp.data.summary);
      } else {
        setSummary("No summary data returned from the backend.");
      }
    } catch (error) {
      console.error("Failed to fetch summary from /summary/insights:", error);
      setSummary("Error fetching summary data from the backend.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPlan, dateRange, authToken]);

  // Re-run whenever user changes date range or tab
  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary, currentTab, currentDate]);

  const dayOrRange =
    currentTab === "Day"
      ? dateRange.start.toFormat("EEE MMM d")
      : `${dateRange.start.toFormat("MMM d")} - ${dateRange.end.toFormat("MMM d")}`;

  return (
    <Card>
      <TouchableOpacity style={styles.header} onPress={handleToggle}>
        <View style={styles.titleContainer}>
          <Image source={beeIcon} style={styles.beeIcon} />
          <AppText style={[styles.headline, { color: theme.colors.darkGrey }]}>
            Beebo's Summary
          </AppText>
        </View>
        {collapsed ? (
          <SFSymbol
            name="chevron.down"
            size={18}
            color={theme.colors.inactiveDark}
            style={{ marginRight: 9 }}
          />
        ) : (
          <SFSymbol
            name="chevron.up"
            size={18}
            color={theme.colors.inactiveDark}
            style={{ marginRight: 9 }}
          />
        )}
      </TouchableOpacity>

      {!collapsed && (
        <View style={{ marginTop: 8 }}>
          <AppText style={[theme.typography.p, styles.dateLabel]}>
            {dayOrRange}
          </AppText>

          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : summary ? (
            <AppText style={[theme.typography.p, styles.summaryText]}>
              {summary}
            </AppText>
          ) : null}
        </View>
      )}
    </Card>
  );
};

export default React.memo(InsightsSummary)

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  beeIcon: {
    width: 28,
    height: 32,
    resizeMode: "contain",
    marginRight: 8,
  },
  headline: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dateLabel: {
    color: "gray",
    marginTop: 4,
  },
  summaryText: {
    color: "#000",
    paddingVertical: 8,
  },
});
