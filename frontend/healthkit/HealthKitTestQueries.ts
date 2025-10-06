import { HealthKitParameters } from './HealthKitModule';
    
interface TestQuery {
    description: string;
    parameters: HealthKitParameters
}

export type { TestQuery as TestQueryType }

export const testAllSampleTypes: TestQuery[] = [
    ...[
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
        'oxygenSaturation',
        'respiratoryRate',
        'sleepAnalysis',
        'workout',
    ].map((sample_type) => ({
        description: `Test Sample Type: ${sample_type}`,
        parameters: {
            sample_type,
        },
    })),
];

export const testParameterInputs: TestQuery[] = [
    // Step Count Tests
    {
        description: 'Step Count - Last week daily',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'last week',
            interval: 'day',
        },
    },
    {
        description: 'Step Count - Yesterday hourly',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'yesterday',
            interval: 'hour',
        },
    },
    {
        description: 'Step Count - Last month weekly',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'last month',
            interval: 'week',
        },
    },

    // Sleep Analysis Tests
    {
        description: 'Sleep Analysis - Last week daily',
        parameters: {
            sample_type: 'sleepAnalysis',
            start_date: 'last week',
            interval: 'day',
        },
    },
    {
        description: 'Sleep Analysis - First day of last month to today',
        parameters: {
            sample_type: 'sleepAnalysis',
            start_date: 'first day of last month',
            end_date: 'today',
            interval: 'day',
        },
    },
    {
        description: 'Sleep Analysis - Last month weekly',
        parameters: {
            sample_type: 'sleepAnalysis',
            start_date: 'last month',
            interval: 'week',
        },
    },

    // Workout Tests
    {
        description: 'Workout - Yesterday daily',
        parameters: {
            sample_type: 'workout',
            start_date: 'yesterday',
            interval: 'day',
        },
    },
    {
        description: 'Workout - Last week weekly',
        parameters: {
            sample_type: 'workout',
            start_date: 'last week',
            interval: 'week',
        },
    },
    {
        description: 'Workout - Last month daily',
        parameters: {
            sample_type: 'workout',
            start_date: 'last month',
            interval: 'day',
        },
    },
];

export const testNaturalLanguage: TestQuery[] = [
    {
        description: 'Step Count - From last Monday to next Monday',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'last Monday',
            end_date: 'next Monday',
            interval: 'day',
        },
    },
    {
        description: 'Sleep Analysis - Last two weeks daily',
        parameters: {
            sample_type: 'sleepAnalysis',
            start_date: '2 weeks ago',
            interval: 'day',
        },
    },
    {
        description: 'Workout - First day of this year to today, monthly',
        parameters: {
            sample_type: 'workout',
            start_date: 'first day of this year',
            end_date: 'today',
            interval: 'month',
        },
    },
];

export const testQueriesErrorAndEdgeCases: TestQuery[] = [
    {
        description: 'Query in the future (returns no data)',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'next week',
            end_date: '2 weeks from now',
            interval: 'day',
        },
    },
    {
        description: 'Start date after end date',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'today',
            end_date: 'yesterday',
            interval: 'day',
        },
    },
    {
        description: 'Missing start date (defaults to today)',
        parameters: {
            sample_type: 'stepCount',
            interval: 'day',
        },
    },
    {
        description: 'Missing interval (defaults to day)',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'yesterday',
        },
    },
    {
        description: 'Invalid natural language date',
        parameters: {
            sample_type: 'stepCount',
            start_date: 'sometime in the future',
            interval: 'day',
        },
    },
    {
        description: 'Unsupported interval for sleep analysis',
        parameters: {
            sample_type: 'sleepAnalysis',
            start_date: 'yesterday',
            interval: 'hour', // Unsupported for sleep analysis
        },
    },
];

export const testBoundaryConditions: TestQuery[] = [
    {
        description: 'Step Count - Start and end at exact boundaries (daily)',
        parameters: {
            sample_type: 'stepCount',
            start_date: '2024-11-01T00:00:00Z',
            end_date: '2024-11-01T23:59:59Z',
            interval: 'day',
        },
    },
    {
        description: 'Sleep Analysis - End date at boundary (daily)',
        parameters: {
            sample_type: 'sleepAnalysis',
            start_date: 'yesterday',
            end_date: 'today',
            interval: 'day',
        },
    },
    {
        description: 'Workout - Weekly aggregation over exact weeks',
        parameters: {
            sample_type: 'workout',
            start_date: 'first day of last week',
            end_date: 'last day of last week',
            interval: 'week',
        },
    },
    {
        description: 'Workout - Monthly aggregation with start at exact month boundary',
        parameters: {
            sample_type: 'workout',
            start_date: 'first day of this month',
            end_date: 'last day of this month',
            interval: 'month',
        },
    },
];
