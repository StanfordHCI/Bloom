//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import Foundation


extension Date {
    /// converts Date object to ISO Format string. Can optionally pass in a time zone to convert it to.
    /// If no timezone is passed, it converts the Date object using the local time zone.
    func toISOFormat(timezone: TimeZone? = nil) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withTime, .withColonSeparatorInTime, .withFractionalSeconds]
        if let timezone = timezone {
            formatter.timeZone = timezone
        } else {
            formatter.timeZone = TimeZone.current
        }
        return formatter.string(from: self)
    }
    
    /// one Month in the past.
    func oneMonthInThePast() -> Date? {
        Calendar.current.date(byAdding: .month, value: -1, to: self)
    }
}
