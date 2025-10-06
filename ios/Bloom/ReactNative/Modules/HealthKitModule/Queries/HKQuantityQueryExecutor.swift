//
//  HKQuantityQueryExecutor.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/29/2024.
//

import HealthKit

/**
 A struct containing parameters for an `HKStatisticsCollectionQuery`.
 */
struct HKQuantityQueryParameters {
    let quantityType: HKQuantityType
    let predicate: NSPredicate
    let intervalComponents: DateComponents
    let options: HKStatisticsOptions
    let startDate: Date
    let endDate: Date
    let resolve: RCTPromiseResolveBlock
    let reject: RCTPromiseRejectBlock
}

/**
 Executes an `HKStatisticsCollectionQuery` for `HKQuantityType` samples.
 */
class HKQuantityQueryExecutor {
    private let healthStore: HKHealthStore
    private let params: HKQuantityQueryParameters

    /**
     Initializes a new instance of `HKQuantityQueryExecutor`.

     - Parameters:
       - healthStore: An instance of `HKHealthStore`.
       - params: The query parameters.
     */
    init(healthStore: HKHealthStore, params: HKQuantityQueryParameters) {
        self.healthStore = healthStore
        self.params = params
    }

    /**
     Executes the query.
     */
    func execute() {
        // First, run a query with .separateBySource to get unique sources (e.g., "iPhone", "Apple Watch")
        fetchSources { uniqueSources, error in
            if let error = error {
                self.params.reject("E_SOURCE_QUERY_FAILED", "Source query failed with error: \(error.localizedDescription)", error)
                return
            }
            
            // Then, run the main statistics query without .separateBySource for aggregated data
            let anchorDate = Calendar.current.startOfDay(for: self.params.startDate)
            let query = HKStatisticsCollectionQuery(
                quantityType: self.params.quantityType,
                quantitySamplePredicate: self.params.predicate,
                options: self.params.options,
                anchorDate: anchorDate,
                intervalComponents: self.params.intervalComponents
            )

            query.initialResultsHandler = { _, results, error in
                self.handleResults(results: results, error: error, sources: uniqueSources)
            }

            self.healthStore.execute(query)
        }
    }

    /**
     Runs an `HKStatisticsCollectionQuery` with `.separateBySource` to gather unique sources.

     - Parameters:
       - completion: A closure that receives the set of unique source names or an error.
     */
    private func fetchSources(completion: @escaping (Set<String>, Error?) -> Void) {
        let queryWithSources = HKStatisticsCollectionQuery(
            quantityType: params.quantityType,
            quantitySamplePredicate: params.predicate,
            options: params.options.union([.separateBySource]),
            anchorDate: Calendar.current.startOfDay(for: params.startDate),
            intervalComponents: params.intervalComponents
        )

        queryWithSources.initialResultsHandler = { _, results, error in
            if let error = error {
                completion([], error)
                return
            }

            var uniqueSources: Set<String> = []
            results?.enumerateStatistics(from: self.params.startDate, to: self.params.endDate) { statistics, _ in
                if let sources = statistics.sources {
                    for source in sources {
                        uniqueSources.insert(source.name)
                    }
                }
            }

            completion(uniqueSources, nil)
        }

        healthStore.execute(queryWithSources)
    }

    /**
     Handles the results of the main statistics query.

     - Parameters:
       - results: The statistics collection results.
       - error: An optional error.
       - sources: A set of unique source names.
     */
    private func handleResults(results: HKStatisticsCollection?, error: Error?, sources: Set<String>) {
        if let error = error {
            params.reject("E_QUERY_FAILED", "Query failed with error: \(error.localizedDescription)", error)
            return
        }

        var data: [[String: Any]] = []
        let unit = HKUnitMapper.unit(for: params.quantityType)
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = TimeZone.current

        results?.enumerateStatistics(from: params.startDate, to: params.endDate) { statistics, _ in
            guard let value = self.getValue(from: statistics, unit: unit) else {
                return
            }

            let dataPoint: [String: Any] = [
                "startDate": formatter.string(from: statistics.startDate),
                "endDate": formatter.string(from: statistics.endDate),
                "value": value,
                "unit": unit.unitString,
                "sources": Array(sources)
            ]

            data.append(dataPoint)
        }

        params.resolve(data)
    }

    /**
     Retrieves the value from `HKStatistics` based on the options.

     - Parameters:
       - statistics: The `HKStatistics` instance.
       - unit: The `HKUnit` to use for the value.

     - Returns: An optional `Double` representing the value.
     */
    private func getValue(from statistics: HKStatistics, unit: HKUnit) -> Double? {
        if params.options.contains(.cumulativeSum) {
            return statistics.sumQuantity()?.doubleValue(for: unit)
        } else if params.options.contains(.discreteAverage) {
            return statistics.averageQuantity()?.doubleValue(for: unit)
        } else if params.options.contains(.discreteMin) {
            return statistics.minimumQuantity()?.doubleValue(for: unit)
        } else if params.options.contains(.discreteMax) {
            return statistics.maximumQuantity()?.doubleValue(for: unit)
        } else {
            return nil
        }
    }
}
