//
//  HealthKitModule.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/29/2024.
//

import Foundation
import HealthKit
import OSLog
import React
import SpeziHealthKit
import SwiftDate


@objc(HealthKitModule)
class HealthKitModule: NSObject {
    private let healthStore = HKHealthStore()
    let logger = Logger(subsystem: "Bloom", category: "HealthKitModule")
    
    @objc(requestPermissions:rejecter:)
    func requestPermissions(
        resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await speziHealthKitModule.askForAuthorization()
                resolve("AUTHORIZATION_SUCCESS")
            } catch {
                reject("AUTHORIZATION_FAILED", "Failed to request HealthKit permissions: \(error.localizedDescription)", error)
            }
        }
    }
    
    /**
     Performs a HealthKit query based on the provided parameters.
     
     - Parameters:
       - parameters: A dictionary containing query parameters.
       - resolve: A promise resolve block.
       - reject: A promise reject block.
     */
    @objc
    func query(
        _ parameters: [String: Any],
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        NSLog("Calling query with arguments \(parameters)")
        
        // Parse parameters
        guard let queryParams = HKQueryParameters(parameters: parameters, rejecter: reject) else {
            return
        }
        NSLog("Parsed query parameters: \(queryParams)")
        
        // Execute the query
        let executor = HKQueryExecutor(healthStore: healthStore)
        executor.executeQuery(
            with: queryParams,
            resolve: resolve,
            reject: reject
        )
    }
    
    @objc
    func fetchWorkouts(
        _ startDate: String,
        endDate: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        NSLog("HK: fetchWorkouts called: startDate=\(startDate), endDate=\(endDate)")
            
        guard let start = startDate.toISODate()?.convertTo(region: .current).date else {
            reject("E_INVALID_START_DATE", "Invalid startDate: \(startDate)", nil)
            return
        }
        guard let end = endDate.toISODate()?.convertTo(region: .current).date else {
            reject("E_INVALID_END_DATE", "Invalid endDate: \(endDate)", nil)
            return
        }
        guard start < end else {
            reject("E_INVALID_DATE_RANGE", "startDate must be before endDate", nil)
            return
        }

        Task {
            let workoutFetcher = HKWorkoutFetcher(healthStore: healthStore)
            do {
                // Await the async/throwing function
                let workouts = try await workoutFetcher.fetchWorkouts(startDate: start, endDate: end)
                NSLog("HK: fetchWorkouts succeeded, returning \(workouts.count) workouts.")
                resolve(workouts)
            } catch {
                NSLog("HK: fetchWorkouts error: \(error.localizedDescription)")
                reject("E_WORKOUTS_FETCH_FAILED", error.localizedDescription, error)
            }
        }
    }

    @MainActor
    @objc(getAuthorizedStatus:rejecter:)
    func getAuthorizedStatus(
        resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let authorizedStatus = speziHealthKitModule.isFullyAuthorized
        self.logger.info("HealthKit auth state: \(authorizedStatus)")
        resolve(authorizedStatus)
    }
}
