//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import HealthKit
import SpeziHealthKit


enum HealthKitSampleTypes {
    // https://developer.apple.com/documentation/healthkit/data_types#2939032
     static let activityQuantitySampleTypes: [SampleType<HKQuantitySample>] = [
        .stepCount,
        .distanceWalkingRunning,
        .basalEnergyBurned,
        .activeEnergyBurned,
        .flightsClimbed,
        .appleExerciseTime,
        .appleMoveTime,
        .appleStandTime
     ]

    private static let vitalSignsQuantitySampleTypes: [SampleType<HKQuantitySample>] = [
        .heartRate,
        .restingHeartRate,
        .heartRateVariabilitySDNN,
        .walkingHeartRateAverage
    ]
    
    static var quantitySampleTypes: [SampleType<HKQuantitySample>] {
        activityQuantitySampleTypes + vitalSignsQuantitySampleTypes
    }

    static let categorySampleTypes: [SampleType<HKCategorySample>] = [
        .sleepAnalysis
    ]
    
    static let otherSampleTypes: [SampleType<HKWorkout>] = [
        .workout
    ]
    
    static var allHealthKitBulkUploadSampleTypes: [any AnySampleType] {
        activityQuantitySampleTypes + categorySampleTypes + otherSampleTypes
    }
}
