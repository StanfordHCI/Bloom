type SampleType =
  | 'stepCount'
  | 'distanceWalkingRunning'
  | 'basalEnergyBurned'
  | 'activeEnergyBurned'
  | 'flightsClimbed'
  | 'appleExerciseTime'
  | 'appleMoveTime'
  | 'appleStandTime'
  | 'heartRate'
  | 'restingHeartRate'
  | 'heartRateVariabilitySDNN'
  | 'walkingHeartRateAverage'
  | 'sleepAnalysis'
  | 'workout';

export const sampleTypes: SampleType[] = [
  'stepCount',
  'distanceWalkingRunning',
  'basalEnergyBurned',
  'activeEnergyBurned',
  'flightsClimbed',
  'appleExerciseTime',
  'appleMoveTime',
  'appleStandTime',
  'heartRate',
  'restingHeartRate',
  'heartRateVariabilitySDNN',
  'walkingHeartRateAverage',
  'sleepAnalysis',
  'workout',
];

type SampleCategory = 'count' | 'rate' | 'sleep' | 'workout';

enum ChartType {
  Bar = 'bar',
  Line = 'line',
  Sleep = 'stackedBar',
  Workout = 'workout',
}

function getSampleCategory(sampleType: SampleType): SampleCategory {
  const categoryMap: Record<SampleType, SampleCategory> = {
    stepCount: 'count',
    distanceWalkingRunning: 'count',
    basalEnergyBurned: 'count',
    activeEnergyBurned: 'count',
    flightsClimbed: 'count',
    appleExerciseTime: 'count',
    appleMoveTime: 'count',
    appleStandTime: 'count',
    heartRate: 'rate',
    restingHeartRate: 'rate',
    heartRateVariabilitySDNN: 'rate',
    walkingHeartRateAverage: 'rate',
    sleepAnalysis: 'sleep',
    workout: 'workout',
  };
  return categoryMap[sampleType];
}

function getChartTypeForCategory(category: SampleCategory): ChartType {
  const chartTypeMap: Record<SampleCategory, ChartType> = {
    count: ChartType.Bar,
    rate: ChartType.Line,
    sleep: ChartType.Sleep,
    workout: ChartType.Workout,
  };

  return chartTypeMap[category];
}

// Main function to get chart configuration
function getChartConfigForSampleType(sampleType: SampleType): { chartType: ChartType; unit: string; title: string } {
  const category = getSampleCategory(sampleType);
  const chartType = getChartTypeForCategory(category);

  const displayConfigMap: Record<SampleType, { unit: string; title: string }> = {
    stepCount: { unit: 'steps', title: 'Step Count' },
    distanceWalkingRunning: { unit: 'miles', title: 'Walking & Running Distance' },
    basalEnergyBurned: { unit: 'calories', title: 'Basal Energy Burned' },
    activeEnergyBurned: { unit: 'calories', title: 'Active Energy Burned' },
    flightsClimbed: { unit: 'flights', title: 'Flights Climbed' },
    appleExerciseTime: { unit: 'minutes', title: 'Exercise Time' },
    appleMoveTime: { unit: 'minutes', title: 'Move Time' },
    appleStandTime: { unit: 'minutes', title: 'Stand Time' },
    heartRate: { unit: 'bpm', title: 'Heart Rate' },
    restingHeartRate: { unit: 'bpm', title: 'Resting Heart Rate' },
    heartRateVariabilitySDNN: { unit: 'ms', title: 'Heart Rate Variability (SDNN)' },
    walkingHeartRateAverage: { unit: 'bpm', title: 'Walking Heart Rate Average' },
    sleepAnalysis: { unit: 'hours', title: 'Sleep' },
    workout: { unit: '', title: 'Workouts' },
  };

  const displayConfig = displayConfigMap[sampleType];

  return {
    chartType,
    ...displayConfig,
  };
}

export type { SampleType };
export { ChartType, getSampleCategory, getChartConfigForSampleType };