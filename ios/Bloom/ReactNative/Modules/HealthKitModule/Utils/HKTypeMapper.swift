//
//  HKTypeMapper.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/29/2024.
//

import HealthKit

/**
 A utility class for mapping string identifiers to `HKSampleType` instances.
 */
enum HKTypeMapper {
    /**
     Maps a string identifier to an `HKSampleType`.

     - Parameter string: The string identifier of the sample type.

     - Returns: An optional `HKSampleType` instance.
     */
    static func sampleType(from string: String) -> HKSampleType? {
        let sampleTypes: [String: HKSampleType] = [
            // Quantity Types
            "stepCount": HKQuantityType(.stepCount),
            "distanceWalkingRunning": HKQuantityType(.distanceWalkingRunning),
            "basalEnergyBurned": HKQuantityType(.basalEnergyBurned),
            "activeEnergyBurned": HKQuantityType(.activeEnergyBurned),
            "flightsClimbed": HKQuantityType(.flightsClimbed),
            "appleExerciseTime": HKQuantityType(.appleExerciseTime),
            "appleMoveTime": HKQuantityType(.appleMoveTime),
            "appleStandTime": HKQuantityType(.appleStandTime),
            "heartRate": HKQuantityType(.heartRate),
            "restingHeartRate": HKQuantityType(.restingHeartRate),
            "heartRateVariabilitySDNN": HKQuantityType(.heartRateVariabilitySDNN),
            "walkingHeartRateAverage": HKQuantityType(.walkingHeartRateAverage),
            "oxygenSaturation": HKQuantityType(.oxygenSaturation),
            "respiratoryRate": HKQuantityType(.respiratoryRate),
            "sleepAnalysis": HKCategoryType(.sleepAnalysis),
            "workout": HKObjectType.workoutType()
        ]
        
        return sampleTypes[string]
    }
}
