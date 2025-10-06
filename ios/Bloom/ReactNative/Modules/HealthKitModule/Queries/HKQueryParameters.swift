//
//  HKQueryParameters.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/29/2024.
//

import HealthKit
import SwiftDate

/**
 A struct representing the parameters required to perform a HealthKit query.
 */
struct HKQueryParameters {
    let sampleType: HKSampleType
    let sampleTypeString: String
    let startDate: Date
    let endDate: Date
    let intervalComponents: DateComponents
    
    /**
     Initializes a new instance of `HKQueryParameters` from a dictionary.
     
     - Parameters:
       - parameters: A dictionary containing query parameters.
       - reject: A promise reject block for error handling.
     
     - Returns: An optional `HKQueryParameters` instance.
     */
    init?(parameters: [String: Any], rejecter reject: RCTPromiseRejectBlock) {
        // Parse 'sample_type'
        guard let sampleTypeString = parameters["sample_type"] as? String else {
            reject("E_MISSING_SAMPLE_TYPE", "Missing required parameter: 'sample_type' is required.", nil)
            return nil
        }
        self.sampleTypeString = sampleTypeString
        
        // Map 'sample_type' to HKSampleType
        guard let sampleType = HKTypeMapper.sampleType(from: sampleTypeString) else {
            reject("E_INVALID_SAMPLE_TYPE", "Invalid 'sample_type': '\(sampleTypeString)'. The provided sample type is not recognized.", nil)
            return nil
        }
        self.sampleType = sampleType
        
        // Parse 'interval'
        let intervalString = parameters["interval"] as? String ?? "day"
        guard let intervalComponents = HKQueryParameters.parseInterval(from: intervalString) else {
            reject("E_INVALID_INTERVAL", "Invalid 'interval': '\(intervalString)'. Valid options are 'hour', 'day', 'week', 'month', 'year'.", nil)
            return nil
        }
        self.intervalComponents = intervalComponents
        
        if sampleTypeString == "sleepAnalysis" && intervalString == "hour" {
            reject("E_INVALID_INTERVAL", "Invalid 'interval': 'hour'. The 'hour' interval is not supported for sleep analysis queries.", nil)
            return nil
        }
        
        // Parse 'start_date', default to now, and snap down to the nearest interval boundary
        if let startDateString = parameters["start_date"] as? String {
            guard let parsedStartDate = HKQueryParameters.parseDate(from: startDateString) else {
                reject("E_INVALID_START_DATE", "Invalid 'start_date' format: '\(startDateString)'. Expected ISO 8601 date format.", nil)
                return nil
            }
            self.startDate = HKQueryParameters.snapToBoundary(date: parsedStartDate, intervalComponents: intervalComponents)
        } else {
            self.startDate = HKQueryParameters.snapToBoundary(date: Date(), intervalComponents: intervalComponents)
        }
        
        // Parse 'end_date', default to now, and snap up to the nearest interval boundary
        let endDateString = parameters["end_date"] as? String ?? ISO8601DateFormatter().string(from: Date())
        guard let parsedEndDate = HKQueryParameters.parseDate(from: endDateString) else {
            reject("E_INVALID_END_DATE", "Invalid 'end_date' format: '\(endDateString)'. Expected ISO 8601 date format.", nil)
            return nil
        }
        var snappedEndDate = HKQueryParameters.snapToBoundary(date: parsedEndDate, intervalComponents: intervalComponents)
        snappedEndDate = Calendar.current.date(byAdding: intervalComponents, to: snappedEndDate) ?? parsedEndDate
        self.endDate = min(snappedEndDate, Date())
        
        // Ensure the start date is before the end date
        guard self.startDate < self.endDate else {
            reject("E_INVALID_DATE_RANGE", "Invalid date range: 'start_date' \(self.startDate) must be before 'end_date' \(self.endDate).", nil)
            return nil
        }
    }
    
    private static func parseDate(from dateString: String) -> Date? {
        dateString.toISODate()?.convertTo(region: .current).date
    }
    
    private static func parseInterval(from intervalString: String) -> DateComponents? {
        var interval = DateComponents()
        switch intervalString {
        case "hour":
            interval.hour = 1
        case "day":
            interval.day = 1
        case "week":
            interval.weekOfYear = 1
        case "month":
            interval.month = 1
        case "year":
            interval.year = 1
        default:
            return nil
        }
        return interval
    }
    
    // Snap the provided date down to the nearest boundary based on the provided interval components
    private static func snapToBoundary(date: Date, intervalComponents: DateComponents) -> Date {
        let calendar = Calendar.current
        var componentsToUse: Set<Calendar.Component> = []
        
        if intervalComponents.year != nil {
            componentsToUse = [.year]
        } else if intervalComponents.month != nil {
            componentsToUse = [.year, .month]
        } else if intervalComponents.weekOfYear != nil {
            componentsToUse = [.yearForWeekOfYear, .weekOfYear]
        } else if intervalComponents.day != nil {
            componentsToUse = [.year, .month, .day]
        } else {
            return date // Return the original date if no valid interval components are provided
        }
        
        guard let snappedDate = calendar.date(from: calendar.dateComponents(componentsToUse, from: date)) else {
            return date // Return the original date if snapping fails
        }
        
        return snappedDate
    }
}
