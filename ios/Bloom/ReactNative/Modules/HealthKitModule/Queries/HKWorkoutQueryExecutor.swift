//
//  HKWorkoutQueryExecutor.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/29/2024.
//

import HealthKit

/**
 A struct containing parameters for an `HKSampleQuery` on `HKWorkout` samples.
 */
struct HKWorkoutQueryParameters {
    let predicate: NSPredicate
    let resolve: RCTPromiseResolveBlock
    let reject: RCTPromiseRejectBlock
}

/**
 A struct containing aggregated workout data.
*/
private struct AggregatedWorkoutData {
    let workoutType: String
    var totalWorkouts: Int
    var totalDuration: TimeInterval // duration in seconds
    var sources: Set<String>
}

/**
 Executes an `HKSampleQuery` for `HKWorkout` samples.
 */
class HKWorkoutQueryExecutor {
    private let healthStore: HKHealthStore
    private let params: HKWorkoutQueryParameters
    
    /**
     Initializes a new instance of `HKWorkoutQueryExecutor`.

     - Parameters:
       - healthStore: An instance of `HKHealthStore`.
       - params: The query parameters.
     */
    init(healthStore: HKHealthStore, params: HKWorkoutQueryParameters) {
        self.healthStore = healthStore
        self.params = params
    }
    
    /**
     Executes the query.
     */
    func execute() {
        let sampleType = HKObjectType.workoutType()
        let query = HKSampleQuery(
            sampleType: sampleType,
            predicate: params.predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { _, samples, error in
            if let error = error {
                self.params.reject("E_QUERY_FAILED", "Query failed with error: \(error.localizedDescription)", error)
                return
            }
            
            guard let samples = samples else {
                self.params.resolve([])
                return
            }
            
            let data = self.processWorkoutSamples(samples: samples)
            self.params.resolve(data)
        }
        
        healthStore.execute(query)
    }
    
    /**
     Processes the workout samples into aggregated data by workout type.

     - Parameter samples: An array of `HKSample` instances.

     - Returns: An array of dictionaries representing the aggregated workout data.
     */
    private func processWorkoutSamples(samples: [HKSample]) -> [[String: Any]] {
        var workoutDataByType = [String: AggregatedWorkoutData]()
        
        for sample in samples as? [HKWorkout] ?? [] {
            let workoutType = sample.workoutActivityType.name
            let duration = sample.duration // duration in seconds
            let sourceName = sample.sourceRevision.source.name

            if var data = workoutDataByType[workoutType] {
                data.totalWorkouts += 1
                data.totalDuration += duration
                data.sources.insert(sourceName)
                workoutDataByType[workoutType] = data
            } else {
                workoutDataByType[workoutType] = AggregatedWorkoutData(
                    workoutType: workoutType,
                    totalWorkouts: 1,
                    totalDuration: duration,
                    sources: [sourceName]
                )
            }
        }
        
        // Convert aggregated data to array of dictionaries
        var aggregatedDataArray: [[String: Any]] = []
        for data in workoutDataByType.values {
            let totalDurationMinutes = data.totalDuration / 60
            let totalDurationHours = data.totalDuration / 3600
            let averageDurationMinutes = (data.totalDuration / Double(data.totalWorkouts)) / 60
            
            let dict: [String: Any] = [
                "workoutType": data.workoutType,
                "totalWorkouts": data.totalWorkouts,
                "totalDurationMinutes": totalDurationMinutes,
                "totalDurationHours": totalDurationHours,
                "averageDurationMinutes": averageDurationMinutes,
                "sources": Array(data.sources)
            ]
            
            aggregatedDataArray.append(dict)
        }
        
        return aggregatedDataArray
    }
}
