//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseFirestore
import SpeziHealthKit
import SpeziHealthKitBulkExport


extension BloomStandard: HealthKitConstraint {
    private static let sendNotificationOnWorkout = false
    
    
    func handleNewSamples<Sample>(
        _ addedSamples: some Collection<Sample>,
        ofType sampleType: SampleType<Sample>
    ) async {
        for sample in addedSamples {
            logger.info("Adding sample to Firestore: \(sample)")
            do {
                let (path, resource) = try await sample.convertToFirestoreResource()
                try await Firestore.firestore().document(path).setData(resource)
            } catch {
                logger.error("Failed to add data in Firestore: \(error.localizedDescription)")
            }

            if let workout = sample as? HKWorkout {
                if Self.sendNotificationOnWorkout {
                    do {
                        logger.info("Sending local notification for workout: \(workout)")
                        try await sendLocalNotificationForWorkout(workout)
                    } catch {
                        logger.info("Error sending local notification for workout: \(error)")
                    }
                }
                
                await WidgetManager.shared.updateWidgetsInBackground()
            }
        }
    }


    // Remove the deleted HealthKit objects from your application.
    func handleDeletedObjects<Sample>(
        _ deletedObjects: some Collection<HKDeletedObject>,
        ofType sampleType: SampleType<Sample>
    ) async {}
    
    
    private func sendLocalNotificationForWorkout(_ workout: HKWorkout) async throws {
        let dateFormatter = DateFormatter()
        dateFormatter.timeStyle = .short
        dateFormatter.dateStyle = .none
        dateFormatter.locale = Locale.current

        let formattedTime = dateFormatter.string(from: workout.startDate)
        
        let content = UNMutableNotificationContent()
        content.title = "Great job!"
        content.body = "You completed a \(workout.workoutActivityType.name.lowercased()) workout at \(formattedTime)"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "hkworkout_\(workout.uuid)",
            content: content,
            trigger: nil // deliver immediately
        )
        try await UNUserNotificationCenter.current().add(request)
    }
}
