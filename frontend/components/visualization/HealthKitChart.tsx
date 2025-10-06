import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { DateTime } from 'luxon';
import Modal from 'react-native-modal';

import { HealthKitData, HealthKitModule, HealthKitParameters, QuantityDataPoint, SleepDataPoint } from '../../healthkit/HealthKitModule';
import { getSampleCategory, getChartConfigForSampleType, SampleType } from '../../healthkit/sampleTypes';
import { computeCountStats, computeRateStats, computeSleepStats, computeWorkoutStats, Stats } from '../../healthkit/healthKitStats';
import {
  transformCountData, transformRateData, transformSleepData,
  ChartData, QuanitityChartData, SleepChartData, WorkoutChartData
} from '../../healthkit/transformHKtoChartData';
import { getDataSourceDescription, computeSummaryStats, formatSamples } from '../../healthkit/formatHealthKitSummary';

import NavigationRow from './ui/NavigationRow';
import SegmentedButton from './ui/SegmentedButton';
import ChartContainer from './ChartContainer';
import AppText from '../AppText';
import captureError from '../../utils/errorHandling';
import { useTheme } from '../../context/ThemeContext';
import Card from '../Card';

import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { BACKEND_URL } from '../../config';
import { SFSymbol } from 'react-native-sfsymbols';

type AggregationLevel = 'day' | 'week' | 'month';

interface HealthKitChartProps {
  sampleType: SampleType;
  initialAggregationLevel?: AggregationLevel;
  initialReferenceDate?: DateTime;
  // If both startDate and endDate are supplied,
  // the chart becomes fixed (no navigation, no toggles).
  startDate?: DateTime;
  endDate?: DateTime;

  // Whether to show LLM insights (hidden in control condition).
  showInsights?: boolean;
  isChatWidget?: boolean;
  // Whether component should be collapsible.
  // true for insights, false for chat widget
  collapsible?: boolean;
}

interface HKSummaryResponse {
  summary: string;
}

function buildPeriodSummary(
  periodLabel: string,
  sampleType: SampleType,
  startISO: string,
  endISO: string,
  hkData: HealthKitData[],
): string {
  // Convert to local time, so we reflect the user’s local day boundaries
  const startLocal = DateTime.fromISO(startISO).setZone('local');
  const endLocal = DateTime.fromISO(endISO).setZone('local');

  // Format the day boundaries
  const rangeLabel = `${startLocal.toFormat('yyyy-LL-dd')} to ${endLocal.toFormat('yyyy-LL-dd')}`;

  const stats = computeSummaryStats(hkData);
  const samples = formatSamples(hkData);

  let summaryText = `
=== ${periodLabel} (${rangeLabel}) ===
Summary Stats:
${stats}

Samples:
${samples}
`

  // if (sampleType !== "workout") {
  //   summaryText += `\n# Samples
  // ${samples}
  // `;
  // }
  summaryText += `------------------------------------------`

  return summaryText.trim();
}

const HealthKitChart: React.FC<HealthKitChartProps> = ({
  sampleType,
  initialAggregationLevel = 'day',
  initialReferenceDate = DateTime.now(),
  startDate,
  endDate,
  showInsights = false,
  isChatWidget = false,
  collapsible = false,
}) => {
  const isFixedRange = useMemo(() => !!startDate && !!endDate, [startDate, endDate]);
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>(initialAggregationLevel);
  const [referenceDate, setReferenceDate] = useState(initialReferenceDate);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dateRangeLabel, setDateRangeLabel] = useState('');

  // For LLM text
  const [descriptiveText, setDescriptiveText] = useState<string>('');
  const [isInsightsLoading, setIsInsightsLoading] = useState<boolean>(false);

  // For data source info modal
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const dataSourceDesc = getDataSourceDescription(sampleType);

  // For collapsible behavior
  const [collapsed, setCollapsed] = useState(true);

  const { chartType, unit, title } = getChartConfigForSampleType(sampleType);
  const { theme } = useTheme();
  const { authToken } = useAuth();

  const category = getSampleCategory(sampleType);
  const isUnsupportedDailySleep = aggregationLevel === 'day' && category === 'sleep';

  const hasData = chartData && chartData.length > 0;

  const buildQueryParams = (): Required<HealthKitParameters> => {
    try {
      // If fixed range, override everything
      if (isFixedRange && startDate && endDate) {
        return {
          sample_type: sampleType,
          start_date: startDate.toISO()!,
          end_date: endDate.toISO()!,
          interval: 'day',
        };
      }

      if (referenceDate > DateTime.now()) {
        setReferenceDate(DateTime.now());
      }

      // Day mode
      if (aggregationLevel === 'day') {
        const startOfDay = referenceDate.startOf('day');
        const endOfDay = referenceDate.endOf('day');
        return {
          sample_type: sampleType,
          start_date: startOfDay.toISO() ?? "",
          end_date: endOfDay.toISO() ?? "",
          interval: sampleType === 'sleepAnalysis' ? 'day' : 'hour'
        };
      } else if (aggregationLevel === 'week') {
        // Luxon's week starts on Monday, but we want to show weeks starting on Sunday
        const startOfWeek =
          referenceDate.weekdayShort === 'Sun'
            ? referenceDate.startOf('day')
            : referenceDate.startOf('week').minus({ days: 1 }).startOf('day');
        const endOfWeek = startOfWeek.plus({ days: 6 }).endOf('day');

        return {
          sample_type: sampleType,
          start_date: startOfWeek.toISO() ?? "",
          end_date: endOfWeek.toISO() ?? "",
          interval: 'day',
        };
      } else { // month
        const startOfMonth = referenceDate.startOf('month');
        const endOfMonth = referenceDate.endOf('month');
        return {
          sample_type: sampleType,
          start_date: startOfMonth.toISO() ?? "",
          end_date: endOfMonth.toISO() ?? "",
          interval: 'day',
        };
      }
    } catch (error) {
      captureError(error, 'Error building query params for HealthKit');

      // Default return to satisfy the function's return type
      return {
        sample_type: sampleType,
        start_date: DateTime.now().toISO(),
        end_date: DateTime.now().toISO(),
        interval: 'day',
      };
    }
  };

  const executeHKQuery = async (
    params: HealthKitParameters
  ): Promise<{ hkData: HealthKitData[]; chartData: ChartData[] }> => {
    try {
      const hkResults = await HealthKitModule.query(params);
      const startDT = DateTime.fromISO(params.start_date ?? '');
      const endDT = DateTime.fromISO(params.end_date ?? '');
      const interval = (params.interval as 'hour' | 'day') || 'day';

      let transformedData: ChartData[] = [];
      if (category === 'count') {
        transformedData = transformCountData(
          hkResults as QuantityDataPoint[],
          startDT,
          endDT,
          interval
        );
      } else if (category === 'rate') {
        transformedData = transformRateData(
          hkResults as QuantityDataPoint[],
          startDT,
          endDT,
          interval
        );
      } else if (category === 'sleep') {
        transformedData = transformSleepData(
          hkResults as SleepDataPoint[],
          startDT,
          endDT,
          interval
        );
      } else if (category === 'workout') {
        transformedData = hkResults as WorkoutChartData[];
      }
      return { hkData: hkResults, chartData: transformedData };
    } catch (err) {
      console.error('Error querying HealthKit:', err);
      return { hkData: [], chartData: [] };
    }
  };

  const fetchHKData = async () => {
    setIsLoading(true);
    setDescriptiveText('');

    try {
      const params = buildQueryParams();
      const { hkData, chartData: transformedData } = await executeHKQuery(params);

      const startDT = DateTime.fromISO(params.start_date);
      const endDT = DateTime.fromISO(params.end_date);

      const dateRangeLabel =
        aggregationLevel === 'day'
          ? startDT.toFormat('EEE MMM d, yyyy')
          : `${startDT.toFormat('MMM d')} - ${endDT.toFormat('MMM d, yyyy')}`;

      let computedStats: Stats | null = null;
      if (category === 'count') {
        computedStats = computeCountStats(transformedData as QuanitityChartData[], unit, aggregationLevel);
      } else if (category === 'rate') {
        computedStats = computeRateStats(transformedData as QuanitityChartData[], unit);
      } else if (category === 'sleep') {
        computedStats = computeSleepStats(transformedData as SleepChartData[], unit);
      } else if (category === 'workout') {
        computedStats = computeWorkoutStats(transformedData as WorkoutChartData[]);
      }

      setChartData(transformedData);
      setStats(computedStats);
      setDateRangeLabel(dateRangeLabel);

      if (!isUnsupportedDailySleep && showInsights && transformedData.length > 0) {
        void fetchLLMInsights(params, hkData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLLMInsights = async (
    currentParams: HealthKitParameters,
    currentPeriodData: HealthKitData[]
  ) => {
    if (!authToken) {
      setIsInsightsLoading(false);
      return;
    }

    setIsInsightsLoading(true);

    interface PeriodData {
      hkData: HealthKitData[];
      startISO: string;
      endISO: string;
      label: string;
    }
    const previousPeriods: PeriodData[] = [];

    const offsets = [1, 2];

    for (const offset of offsets) {
      let prevDate: DateTime;
      if (aggregationLevel === 'day') {
        prevDate = referenceDate.minus({ days: offset });
      } else if (aggregationLevel === 'week') {
        prevDate = referenceDate.minus({ weeks: offset });
      } else {
        prevDate = referenceDate.minus({ months: offset });
      }

      // Build fresh query params for that older reference date
      const tempParams = buildParamsForPreviousPeriod(
        prevDate,
        category,
        sampleType,
        aggregationLevel
      );

      const { hkData: prevHkData } = await executeHKQuery(tempParams);

      const label = `Previous Period #${offset} (the user cannot see this period in the chart, but it can be used for comparison)`;

      previousPeriods.push({
        hkData: prevHkData,
        startISO: tempParams.start_date ?? '',
        endISO: tempParams.end_date ?? '',
        label,
      });
    }

    try {
      // Build text for the current period
      const currentLabel = 'Current Period (this is the period the user is currently viewing in the chart)';
      const currentPeriodText = buildPeriodSummary(
        currentLabel,
        sampleType,
        currentParams.start_date ?? '',
        currentParams.end_date ?? '',
        currentPeriodData
      );

      // Build text for each previous period
      const previousTexts = previousPeriods.map((p) =>
        buildPeriodSummary(p.label, sampleType, p.startISO, p.endISO, p.hkData)
      );

      const finalSummaryText = `
Summary of Chart Data
Sample Type: ${sampleType}
Sample Type Description: ${getDataSourceDescription(sampleType)}
Aggregation Level: ${aggregationLevel}

${currentPeriodText}

${previousTexts.join('\n\n')}
`.trim();

      // Post finalSummaryText to the backend
      const resp = await axios.post<HKSummaryResponse>(
        `${BACKEND_URL}/summary/hkchart`,
        { summaryText: finalSummaryText },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 60000,
        }
      );

      if (resp.data?.summary) {
        setDescriptiveText(resp.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch descriptive text from LLM endpoint:', err);
    } finally {
      setIsInsightsLoading(false);
    }
  };

  function buildParamsForPreviousPeriod(
    referenceDate: DateTime,
    category: ReturnType<typeof getSampleCategory>,
    sType: SampleType,
    aggLevel: AggregationLevel
  ): Required<HealthKitParameters> {

    if (aggLevel === 'day') {
      const startOfDay = referenceDate.startOf('day');
      const endOfDay = referenceDate.endOf('day');
      return {
        sample_type: sType,
        start_date: startOfDay.toISO() ?? '',
        end_date: endOfDay.toISO() ?? '',
        interval: category === 'sleep' ? 'day' : 'hour',
      };
    } else if (aggLevel === 'week') {
      const startOfW =
        referenceDate.weekdayShort === 'Sun'
          ? referenceDate.startOf('day')
          : referenceDate.startOf('week').minus({ days: 1 }).startOf('day');
      const endOfW = startOfW.plus({ days: 6 }).endOf('day');
      return {
        sample_type: sType,
        start_date: startOfW.toISO() ?? '',
        end_date: endOfW.toISO() ?? '',
        interval: 'day',
      };
    } else {
      // month
      const startOfM = referenceDate.startOf('month');
      const endOfM = referenceDate.endOf('month');
      return {
        sample_type: sType,
        start_date: startOfM.toISO() ?? '',
        end_date: endOfM.toISO() ?? '',
        interval: 'day',
      };
    }
  }

  const goLeft = useCallback(() => {
    if (aggregationLevel === 'day') {
      setReferenceDate((prev) => prev.minus({ days: 1 }));
    } else if (aggregationLevel === 'week') {
      setReferenceDate((prev) => prev.minus({ weeks: 1 }));
    } else {
      setReferenceDate((prev) => prev.minus({ months: 1 }));
    }
  }, [aggregationLevel]);

  const goRight = useCallback(() => {
    if (aggregationLevel === 'day') {
      setReferenceDate((prev) => prev.plus({ days: 1 }));
    } else if (aggregationLevel === 'week') {
      setReferenceDate((prev) => prev.plus({ weeks: 1 }));
    } else {
      setReferenceDate((prev) => prev.plus({ months: 1 }));
    }
  }, [aggregationLevel]);

  useEffect(() => {
    if (!isUnsupportedDailySleep) {
      void fetchHKData();
    } else {
      const localRef = referenceDate.setZone('local');
      const todayLabel = localRef.toFormat('EEE MMM d, yyyy');
      setDateRangeLabel(todayLabel);
      setChartData([]);
      setStats(null);
      setDescriptiveText('');
    }
  }, [referenceDate, aggregationLevel, isFixedRange, showInsights]);

  // Helper to render the main chart/toggles/insights UI
  const renderChartBody = () => {
    return (
      <>
        {!isFixedRange && (
          <View style={styles.toggleRow}>
            {(['day', 'week', 'month'] as AggregationLevel[]).map((level) => (
              <SegmentedButton
                key={level}
                label={level.charAt(0).toUpperCase() + level.slice(1)}
                active={aggregationLevel === level}
                onPress={() => setAggregationLevel(level)}
              />
            ))}
          </View>
        )}

        {showInsights && (<>
          {isInsightsLoading ?
            (<View style={{ paddingVertical: 8 }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>)
            : descriptiveText ?
              (<>
                <AppText
                  style={[theme.typography.p, styles.descriptiveText]}
                >
                  {descriptiveText}
                </AppText>
              </>)
              : null
          }
        </>)}

        {!isFixedRange && (
          <NavigationRow
            dateRangeLabel={dateRangeLabel}
            onPressLeft={goLeft}
            onPressRight={goRight}
            disableRight={referenceDate.endOf(aggregationLevel) >= DateTime.now()}
            disableAll={isFixedRange}
          />
        )}

        {isUnsupportedDailySleep ? (
          <AppText style={styles.unsupportedMessage}>Daily sleep not supported</AppText>
        ) : (
          <View style={[styles.chartContainer, { height: 300 }]}>
            {isLoading && (
              <View style={StyleSheet.absoluteFill}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.primary}
                  style={{ alignSelf: 'center' }}
                />
              </View>
            )}
            {!isLoading && hasData && (
              <ChartContainer
                chartType={chartType}
                data={chartData}
                stats={stats}
                isLoading={isLoading}
              />
            )}
            {!isLoading && !hasData && (
              <AppText style={[theme.typography.p, styles.noData]}>
                No data available
              </AppText>
            )}
          </View>
        )}
      </>
    );
  };

  return (
    <Card style={[isChatWidget && { marginVertical: 0 }]}>
      <Modal
        isVisible={infoModalVisible}
        onBackdropPress={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <AppText style={[theme.typography.p]}>
            {dataSourceDesc}
          </AppText>
          <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
            <AppText style={[styles.closeModalText,
            { color: theme.colors.primary }
            ]}>
              Close
            </AppText>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Header Row */}
      <View style={styles.header}>
        {/* Left side: Title + info icon (tap => info modal) */}
        <TouchableOpacity
          onPress={() => setInfoModalVisible(true)}
          style={styles.leftHeader}
        >
          <AppText
            style={[
              theme.typography.h3,
              styles.titleText,
              { color: theme.colors.text, marginBottom: 0 }
            ]}
          >
            {title}
          </AppText>
          <SFSymbol
            name="info.circle"
            color={theme.colors.text}
            scale="medium"
            size={15}
            style={{ marginLeft: 12, marginBottom: 0 }}
          />
        </TouchableOpacity>

        {/* Right side: Date range label + chevron if collapsible */}
        <TouchableOpacity 
          style={styles.rightHeader}
          onPress={() => setCollapsed(!collapsed)}
        >
          {collapsible && (
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <SFSymbol
                name={collapsed ? 'chevron.down' : 'chevron.up'}
                size={18}
                color={theme.colors.inactiveDark}
                style={{ marginRight: 9 }}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Show body if not collapsed OR if collapsible=false */}
      {(!collapsible || !collapsed) && (
        <View style={{ marginTop: 12 }}>
          {renderChartBody()}
        </View>
      )}
    </Card>
  );
};

export default HealthKitChart;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateRangeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    paddingVertical: 4,
  },
  descriptiveText: {
    paddingVertical: 8,
    lineHeight: 20,
  },
  chartContainer: {
    justifyContent: 'center',
  },
  unsupportedMessage: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    fontWeight: '500',
    color: 'gray',
  },
  noData: {
    textAlign: 'center',
    color: 'gray',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  closeModalText: {
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
