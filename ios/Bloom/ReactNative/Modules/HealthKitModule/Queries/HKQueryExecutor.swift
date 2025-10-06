//
//  HKQueryExecutor.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/29/2024.
//

import HealthKit

/**
 The `HKQueryExecutor` class determines the type of HealthKit query to execute based on the sample type.
 */
class HKQueryExecutor {
    private let healthStore: HKHealthStore
    
    /**
     Initializes a new instance of `HKQueryExecutor`.
     
     - Parameter healthStore: An instance of `HKHealthStore`.
     */
    init(healthStore: HKHealthStore) {
        self.healthStore = healthStore
    }
    
    /**
     Executes the appropriate HealthKit query based on the provided parameters.
     
     - Parameters:
       - queryParams: The query parameters.
       - resolve: A promise resolve block.
       - reject: A promise reject block.
     */
    func executeQuery(
        with queryParams: HKQueryParameters,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        // Build predicate
        guard let predicate = createPredicate(
            for: queryParams.sampleType,
            startDate: queryParams.startDate,
            endDate: queryParams.endDate,
            rejecter: reject
        ) else {
            reject("E_INVALID_PREDICATE", "Invalid predicate for query for \(queryParams.sampleTypeString) from \(queryParams.startDate) to \(queryParams.endDate).", nil)
            return
        }
        
        // Execute query based on sample type
        if let quantityType = queryParams.sampleType as? HKQuantityType {
            let params = HKQuantityQueryParameters(
                quantityType: quantityType,
                predicate: predicate,
                intervalComponents: queryParams.intervalComponents,
                options: (quantityType.aggregationStyle == .cumulative) ? .cumulativeSum : .discreteAverage,
                startDate: queryParams.startDate,
                endDate: queryParams.endDate,
                resolve: resolve,
                reject: reject
            )
            
            let executor = HKQuantityQueryExecutor(healthStore: healthStore, params: params)
            executor.execute()
        } else if queryParams.sampleType is HKCategoryType,
                  queryParams.sampleType.identifier == HKCategoryTypeIdentifier.sleepAnalysis.rawValue {
            let params = HKSleepQueryParameters(
                startDate: queryParams.startDate,
                endDate: queryParams.endDate,
                intervalComponents: queryParams.intervalComponents,
                predicate: predicate,
                resolve: resolve,
                reject: reject
            )
            
            let executor = HKSleepQueryExecutor(healthStore: healthStore, params: params)
            executor.execute()
        } else if queryParams.sampleType is HKWorkoutType {
            let params = HKWorkoutQueryParameters(
                predicate: predicate,
                resolve: resolve,
                reject: reject
            )
            
            let executor = HKWorkoutQueryExecutor(healthStore: healthStore, params: params)
            executor.execute()
        } else {
            reject("E_UNSUPPORTED_SAMPLE_TYPE", "Unsupported 'sample_type': '\(queryParams.sampleTypeString)'. This sample type is not supported for queries.", nil)
        }
    }
    
    private func createPredicate(
        for sampleType: HKSampleType,
        startDate: Date,
        endDate: Date,
        rejecter reject: RCTPromiseRejectBlock
    ) -> NSPredicate? {
        // if workout or quantity type
        if sampleType is HKWorkoutType || sampleType is HKQuantityType {
            let predicate = HKQuery.predicateForSamples(
                withStart: startDate,
                end: endDate,
                options: []
            )
            return predicate
        } else if sampleType is HKCategoryType,
                sampleType.identifier == HKCategoryTypeIdentifier.sleepAnalysis.rawValue {
            // augment the predict such that
            // - start date includes the previous day from 3pm
            // - end date includes the current day at 3pm
            let calendar = Calendar.current
            guard let previousDay = calendar.date(byAdding: .day, value: -1, to: startDate),
                  let adjustedStartDate = calendar.date(bySettingHour: 15, minute: 0, second: 0, of: previousDay)
            else {
                reject("E_INVALID_DATE", "Invalid 'start_date' format.", nil)
                return nil
            }
            
            guard let adjustedEndDate = calendar.date(bySettingHour: 15, minute: 0, second: 0, of: endDate)
            else {
                reject("E_INVALID_DATE", "Invalid 'end_date' format.", nil)
                return nil
            }
            
            let predicate = HKQuery.predicateForSamples(
                withStart: adjustedStartDate,
                end: adjustedEndDate,
                options: [.strictStartDate, .strictEndDate]
            )
            return predicate
        } else {
            return nil
        }
    }
}
