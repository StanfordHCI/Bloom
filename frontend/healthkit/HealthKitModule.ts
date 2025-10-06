import { NativeModules } from 'react-native';
import { WorkoutType } from './workoutTypes';

interface HealthKitParameters {
    sample_type: string;
    start_date?: string;
    end_date?: string;
    interval?: string;
}

interface HealthKitToolCallParameters {
    sample_type: string;
    reference_date: string;
    aggregation_level: string;
    show_user?: boolean;
}

interface QuantityDataPoint {
    startDate: string;
    endDate: string;
    value: number;
    unit: string;
    sources: string[];
}

interface WorkoutDataPoint {
    workoutType: string;
    totalWorkouts: number;
    totalDurationMinutes: number;
    totalDurationHours: number;
    averageDurationMinutes: number;
    sources: string[];
}

// sleepDuration and inBedDuration are optional because
// a given sleep data point may not have both values.
interface SleepDataPoint {
    startDate: string;
    endDate: string;
    sleepDuration?: number;
    inBedDuration?: number;
    sleepDurationStr: string;
    inBedDurationStr: string;
    unit: string;
    sources: string[];
}

// Used only in the HealthKitModule.fetchWorkouts method
// This represents a single workout
// WorkoutDataPoint is used to represent aggregated workout data
interface HKWorkout {
  id: string; 
  workoutType: WorkoutType;
  durationMin: number;    
  timeStart: string;
  source: string;      
}


type HealthKitData = QuantityDataPoint | WorkoutDataPoint | SleepDataPoint;

type HealthKitModuleType = {
    query: (parameters: HealthKitParameters) => Promise<HealthKitData[]>;
    fetchWorkouts: (startDate: string, endDate: string) => Promise<HKWorkout[]>;
};

const { HealthKitModule } = NativeModules as {
    HealthKitModule: HealthKitModuleType;
};

export { HealthKitModule };
export type {
    HealthKitParameters,
    HealthKitToolCallParameters,
    HealthKitData,
    QuantityDataPoint,
    WorkoutDataPoint,
    SleepDataPoint,
    HKWorkout
};
