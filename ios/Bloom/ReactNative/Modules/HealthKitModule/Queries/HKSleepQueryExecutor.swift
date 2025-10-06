//
//  HKSleepQueryExecutor.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/29/2024.
//

import HealthKit

/**
 A struct containing parameters for an `HKSampleQuery` on `HKCategoryType` samples.
 */
struct HKSleepQueryParameters {
    let startDate: Date
    let endDate: Date
    let intervalComponents: DateComponents
    let predicate: NSPredicate
    let resolve: RCTPromiseResolveBlock
    let reject: RCTPromiseRejectBlock
}

/**
 A struct containing aggregated sleep data.
 */
private struct SleepData {
    let sleepDuration: Int? // duration in seconds
    let inBedDuration: Int? // duration in seconds
    let sources: Set<String>
}

/**
 Executes an `HKSampleQuery` for `sleepAnalysis` types.
 */
class HKSleepQueryExecutor {
    private let healthStore: HKHealthStore
    private let params: HKSleepQueryParameters
    
    /**
     Initializes a new instance of `HKCategoryQueryExecutor`.

     - Parameters:
       - healthStore: An instance of `HKHealthStore`.
       - params: The query parameters.
     */
    init(healthStore: HKHealthStore, params: HKSleepQueryParameters) {
        self.healthStore = healthStore
        self.params = params
    }
    
    /**
     Executes the query.
     */
    func execute() {
        let sampleType = HKCategoryType(.sleepAnalysis)
        
        let query = HKSampleQuery(
            sampleType: sampleType,
            predicate: params.predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { _, samples, error in
            guard let samples = samples as? [HKCategorySample] else {
                self.params.resolve([])
                return
            }
            
            self.handleQueryResult(samples: samples, error: error)
        }
        healthStore.execute(query)
    }

    private func handleQueryResult(samples: [HKSample], error: Error?) {
        if let error = error {
            self.params.reject("E_QUERY_FAILED", "Query failed with error: \(error.localizedDescription)", error)
            return
        }

        guard let samples = samples as? [HKCategorySample] else {
            self.params.resolve([])
            return
        }
        
        let uniqueDates = Set(samples.map { Calendar.current.startOfDay(for: $0.startDate) })
        NSLog("Found \(samples.count) samples on \(uniqueDates.count) unique dates")
        NSLog("Unique dates: \(uniqueDates)")
        
        let data = self.processAllSamples(samples)
        self.params.resolve(data)
    }

    private func processAllSamples(_ samples: [HKCategorySample]) -> [[String: Any]] {
        var data: [[String: Any]] = []
        let calendar = Calendar.current

        var intervalStartDate = params.startDate
        let interval = params.intervalComponents
        let endDate = params.endDate

        // In the outer loop, we iterate over the intervals
        while intervalStartDate < endDate {
            let intervalEndDate = calendar.date(byAdding: interval, to: intervalStartDate) ?? endDate
            NSLog("Processing interval: \(intervalStartDate) - \(intervalEndDate)")

            var intervalDailySleepData: [SleepData] = []
            var currentDate = intervalStartDate
            
            // In the inner loop, we iterate over the days within the interval
            while currentDate < intervalEndDate {
                NSLog("Processing date: \(currentDate)")
                if let dailySleepData = calculateDailySleepData(for: currentDate, samples: samples) {
                    intervalDailySleepData.append(dailySleepData)
                    NSLog("\(dailySleepData)")
                }
                currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate) ?? intervalEndDate
            }

            // Aggregate daily data to compute averages
            if let aggregatedData = aggregateDailyData(intervalDailySleepData) {
                let formatter = ISO8601DateFormatter()
                formatter.timeZone = TimeZone.current
                
                let results: [String: Any] = [
                    "startDate": formatter.string(from: intervalStartDate),
                    "endDate": formatter.string(from: intervalEndDate),
                    "sleepDuration": aggregatedData.sleepDuration as Any,
                    "inBedDuration": aggregatedData.inBedDuration as Any,
                    "sleepDurationStr": formatDuration(aggregatedData.sleepDuration),
                    "inBedDurationStr": formatDuration(aggregatedData.inBedDuration),
                    "unit": "seconds",
                    "sources": Array(aggregatedData.sources)
                ]
                data.append(results)
            }

            intervalStartDate = intervalEndDate
        }

        return data
    }

    private func calculateDailySleepData(for currentDate: Date, samples: [HKCategorySample]) -> SleepData? {
        let calendar = Calendar.current

        guard
            // Start of the sleep day is the previous day at 3 PM
            let startOfSleepDay = calendar.date(byAdding: .day, value: -1, to: currentDate),
            let startOfSleep = calendar.date(bySettingHour: 15, minute: 0, second: 0, of: startOfSleepDay),
            // End of the sleep day is the current day at 3 PM
            let endOfSleep = calendar.date(bySettingHour: 15, minute: 0, second: 0, of: currentDate)
        else {
            NSLog("Failed to calculate sleep day boundaries for \(currentDate)")
            return nil
        }

        // Filter samples within the 3 PM to 3 PM window
        let sleepDaySamples = samples.filter { sample in
            sample.endDate > startOfSleep && sample.startDate < endOfSleep
        }

        if sleepDaySamples.isEmpty {
            NSLog("No sleep data for \(currentDate)")
            return nil
        }

        let sleepData = self.calculateDurations(from: sleepDaySamples)

        return SleepData(
            sleepDuration: sleepData.sleepDuration,
            inBedDuration: sleepData.inBedDuration,
            sources: sleepData.sources
        )
    }

    private func calculateDurations(from samples: [HKCategorySample]) -> SleepData {
        var sleepDurations: [String: TimeInterval] = [:]
        var inBedDurations: [String: TimeInterval] = [:]
        var sources: Set<String> = []

        let asleepValues = Set(HKCategoryValueSleepAnalysis.allAsleepValues.map { $0.rawValue })
        let inBedValues: Set<Int> = [HKCategoryValueSleepAnalysis.inBed.rawValue]

        for sample in samples {
            let sourceName = sample.sourceRevision.source.name
            sources.insert(sourceName)
            let sampleDuration = sample.endDate.timeIntervalSince(sample.startDate)

            if asleepValues.contains(sample.value) {
                sleepDurations[sourceName, default: 0] += sampleDuration
            }
            if inBedValues.contains(sample.value) {
                inBedDurations[sourceName, default: 0] += sampleDuration
            }
        }

        func selectSource(from durations: [String: TimeInterval]) -> String? {
            let sortedKeys = durations.keys.sorted()
            // Rule 1: Prefer "Apple Watch" if present
            if let appleWatchSource = sortedKeys.first(where: { $0.contains("Apple Watch") }) {
                return appleWatchSource
            }
            // Rule 2: Prefer sources that don't contain "iPhone"
            if let nonIphoneSource = sortedKeys.first(where: { !$0.contains("iPhone") }) {
                return nonIphoneSource
            }
            // Rule 3: Return the source that contains "iPhone"
            return sortedKeys.first(where: { $0.contains("iPhone") })
        }

        let selectedSleepSource = selectSource(from: sleepDurations)
        let selectedInBedSource = selectSource(from: inBedDurations)
        
        var sleepDuration: Int?
        if let selectedSleepSource {
            sleepDuration = Int(sleepDurations[selectedSleepSource]?.rounded() ?? 0)
            if sleepDuration == 0 {
                sleepDuration = nil
            }
        }
        
        var inBedDuration: Int?
        if let selectedInBedSource {
            inBedDuration = Int(inBedDurations[selectedInBedSource]?.rounded() ?? 0)
            if inBedDuration == 0 {
                inBedDuration = nil
            }
        }
        
        return SleepData(
            sleepDuration: sleepDuration,
            inBedDuration: inBedDuration,
            sources: Set([selectedSleepSource, selectedInBedSource].compactMap { $0 })
        )
    }


    private func aggregateDailyData(_ dailyData: [SleepData]) -> SleepData? {
        guard !dailyData.isEmpty else {
            return nil
        }

        var totalSleepDuration: Int = 0
        var totalInBedDuration: Int = 0
        var numDaysAsleep: Int = 0 // Number of days with sleep data
        var numDaysInBed: Int = 0 // Number of days with in bed data (can be different if you don't own a sleep tracker)
        
        var sources: Set<String> = []

        for data in dailyData {
            if let sleepDuration = data.sleepDuration {
                totalSleepDuration += sleepDuration
                numDaysAsleep += 1
            }
            if let inBedDuration = data.inBedDuration {
                totalInBedDuration += inBedDuration
                numDaysInBed += 1
            }
            
            sources.formUnion(data.sources)
        }

        let numDays = Double(dailyData.count)
        
        NSLog("Aggregating daily data for \(numDays) days with \(numDaysAsleep) days asleep and \(numDaysInBed) days in bed")
        
        let averageSleepDuration: Int? = numDaysAsleep > 0 ? {
            let average = Int((Double(totalSleepDuration) / Double(numDaysAsleep)).rounded())
            return average > 0 ? average : nil
        }() : nil
        
        let averageInBedDuration: Int? = numDaysInBed > 0 ? {
            let average = Int((Double(totalInBedDuration) / Double(numDaysInBed)).rounded())
            return average > 0 ? average : nil
        }() : nil

        return SleepData(
            sleepDuration: averageSleepDuration,
            inBedDuration: averageInBedDuration,
            sources: sources
        )
    }

    private func formatDuration(_ duration: Int?) -> String {
        if let duration {
            let hours = duration / 3600
            let minutes = (duration % 3600) / 60
            return String(format: "%02d:%02d", hours, minutes)
        } else {
            return "No data"
        }
    }
}
