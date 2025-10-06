//
//  HKWorkoutFetcher.swift
//  Bloom
//
//  Created by Matthew Jörke on 1/23/25.
//

import HealthKit
import SwiftDate

/**
 * A utility class to fetch workouts from HealthKit within a specified date range.
 *
 * Returns data in this structure:
 * ```
 * [
 *   {
 *     "id": string,            // HealthKit sample UUID
 *     "workoutType": string,   // e.g. "Running", "Walking", ...
 *     "durationMin": number,   // total duration in minutes
 *     "timeStart": string,     // ISO date string
 *     "sources": string[],     // array of source names
 *   }
 * ]
 * ```
 */
class HKWorkoutFetcher {
    private let healthStore: HKHealthStore
    
    init(healthStore: HKHealthStore) {
        self.healthStore = healthStore
    }
    
    private static func mapWorkouts(_ workouts: [HKWorkout], using formatter: ISO8601DateFormatter) -> [[String: Any]] {
        workouts.map { workout in
            [
                "id": workout.uuid.uuidString,
                "workoutType": workout.workoutActivityType.name,
                "durationMin": workout.duration / 60.0,
                "timeStart": formatter.string(from: workout.startDate),
                "sources": [workout.sourceRevision.source.name]
            ]
        }
    }
    
    /**
     * Fetch workouts between `startDate` and `endDate`.
     */
    func fetchWorkouts(startDate: Date, endDate: Date) async throws -> [[String: Any]] {
        try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(
                withStart: startDate,
                end: endDate,
                options: [.strictStartDate, .strictEndDate]
            )
            let sampleType = HKObjectType.workoutType()
            
            let query = HKSampleQuery(
                sampleType: sampleType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { _, samples, error in
                if let error = error {
                    return continuation.resume(throwing: error)
                }
                
                guard let hkWorkouts = samples as? [HKWorkout] else {
                    NSLog("Failed to cast samples to [HKWorkout]")
                    return continuation.resume(returning: [])
                }
                
                NSLog("Fetched \(hkWorkouts.count) workouts")
                
                let formatter = ISO8601DateFormatter()
                formatter.timeZone = .current
                
                continuation.resume(returning: Self.mapWorkouts(hkWorkouts, using: formatter))
            }
            
            self.healthStore.execute(query)
        }
    }
}
