//
//  WidgetManager.swift
//  Bloom
//
//  Created by Matthew Jörke on 2/8/25.
//

import FirebaseAuth
import FirebaseStorage
import Foundation
import HealthKit
import UIKit
import WidgetKit

struct WidgetUpdateRequest: Codable {
    let workouts: [HKWorkoutData]
    let width: Int
    let height: Int
}

struct HKWorkoutData: Codable {
    let id: String
    let workoutType: String
    let durationMin: Double
    let timeStart: String
    let source: String
}

struct WidgetUpdateResponse: Codable {
    let progress: Double
    let nextWorkout: NextWorkoutModel
    let imageURL: String
}

struct NextWorkoutModel: Codable {
    let dayName: String
    let timeString: String
    let type: String
    let durationMin: Int
}

struct WidgetDataModel: Codable {
    let weeklyProgress: Double
    let nextWorkout: NextWorkoutModel
}

class WidgetManager {
    static let shared = WidgetManager()
    
    private let storage = Storage.storage()
    private let healthStore = HKHealthStore()
    private let appGroupID = "group.bloom.widget"
    private var baseURL: URL {
        guard let url = URL(string: Config.backendURL) else {
            fatalError("Invalid Config.backendURL")
        }
        return url
    }

    func updateWidgetsInBackground() async {
        NSLog("WidgetManager.updateWidgetsInBackground triggered")
        do {
            try await refreshWidgetData()
        } catch {
            NSLog("WidgetManager background update failed: \(error)")
        }
    }

    @MainActor
    func performManualRefresh() async throws {
        try await refreshWidgetData()
    }

    private func refreshWidgetData() async throws {
        NSLog("WidgetManager.refreshWidgetData triggered")
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "WidgetManager", code: 401, userInfo: [NSLocalizedDescriptionKey: "No user logged in"])
        }
        let token = try await user.getIDToken()
        
        let workouts = try await fetchRecentWorkouts()
        let screen = await UIScreen.main
        let scale = await screen.scale
        let bounds = await screen.bounds
        let width = Int(bounds.width * scale)
        let height = Int(bounds.height * scale)
        
        let response = try await postWidgetUpdateRequest(
            token: token,
            workouts: workouts,
            width: width,
            height: height
        )
        
        let widgetData = WidgetDataModel(
            weeklyProgress: response.progress,
            nextWorkout: response.nextWorkout
        )
        storeWidgetData(widgetData, filename: "widget_data.json")
        
        guard let imageDownloadURL = URL(string: response.imageURL) else {
            throw NSError(domain: "WidgetManager", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid imageURL returned"])
        }
        
        let imageRef = storage.reference(forURL: response.imageURL)
        let imageData: Data = try await withCheckedThrowingContinuation { continuation in
            imageRef.getData(maxSize: 10 * 1024 * 1024) { data, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else if let data = data {
                    continuation.resume(returning: data)
                } else {
                    let err = NSError(
                        domain: "WidgetManager",
                        code: 400,
                        userInfo: [NSLocalizedDescriptionKey: "Invalid image data"]
                    )
                    continuation.resume(throwing: err)
                }
            }
        }
        
        guard let uiImage = UIImage(data: imageData) else {
            throw NSError(domain: "WidgetManager", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
        }
        
        storeImage(uiImage, filename: "ambient_display.jpg")

        await MainActor.run {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    private func fetchRecentWorkouts() async throws -> [HKWorkout] {
        try await withCheckedThrowingContinuation { continuation in
            NSLog("WidgetManager: Fetching recent workouts for the current week")

            let now = Date()
            // e.g. get this week's Sunday
            guard let sunday = Calendar.current.date(from:
                  Calendar.current.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))
            else {
                continuation.resume(returning: [])
                return
            }

            let predicate = HKQuery.predicateForSamples(
                withStart: sunday,
                end: now,
                options: [.strictStartDate]
            )
            
            let query = HKSampleQuery(
                sampleType: .workoutType(),
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { _, samples, error in
                if let error = error {
                    NSLog("fetchRecentWorkouts error: \(error)")
                    continuation.resume(throwing: error)
                } else if let workouts = samples as? [HKWorkout] {
                    continuation.resume(returning: workouts)
                } else {
                    continuation.resume(returning: [])
                }
            }
            healthStore.execute(query)
        }
    }

    private func postWidgetUpdateRequest(
        token: String,
        workouts: [HKWorkout],
        width: Int,
        height: Int
    ) async throws -> WidgetUpdateResponse {
        guard let url = URL(string: "/widget/update", relativeTo: baseURL) else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        NSLog("WidgetManager: Sending request to URL=\(url)")

        let workoutData = workouts.map { workout in
            HKWorkoutData(
                id: workout.uuid.uuidString,
                workoutType: workout.workoutActivityType.name,
                durationMin: workout.duration / 60.0,
                timeStart: ISO8601DateFormatter().string(from: workout.startDate),
                source: workout.sourceRevision.source.name
            )
        }
        let requestBody = WidgetUpdateRequest(
            workouts: workoutData,
            width: width,
            height: height
        )
        req.httpBody = try JSONEncoder().encode(requestBody)

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let httpResp = response as? HTTPURLResponse,
              (200...299).contains(httpResp.statusCode) else {
            let respBody = String(data: data, encoding: .utf8) ?? ""
            throw NSError(domain: "WidgetManager", code: 500, userInfo: [
                NSLocalizedDescriptionKey: "Non-2xx response from /widget/update => \(respBody)"
            ])
        }
        return try JSONDecoder().decode(WidgetUpdateResponse.self, from: data)
    }

    private func storeWidgetData(_ data: WidgetDataModel, filename: String) {
        NSLog("WidgetManager: Storing widget data")
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupID)
        else {
            NSLog("WidgetManager: could not find container for ID=\(appGroupID)")
            return
        }
        let fileURL = containerURL.appendingPathComponent(filename)

        do {
            let encoded = try JSONEncoder().encode(data)
            try encoded.write(to: fileURL)
        } catch {
            NSLog("WidgetManager: error writing widget_data.json => \(error)")
        }
    }

    private func storeImage(_ image: UIImage, filename: String) {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupID)
        else {
            NSLog("WidgetManager: no container for \(appGroupID)")
            return
        }
        let fileURL = containerURL.appendingPathComponent(filename)

        do {
            if let jpegData = image.jpegData(compressionQuality: 1.0) {
                try jpegData.write(to: fileURL)
            } else {
                NSLog("WidgetManager: Could not create JPEG from UIImage.")
            }
        } catch {
            NSLog("WidgetManager: error writing image => \(error)")
        }
    }
}
