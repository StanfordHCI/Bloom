//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseFirestore
import Foundation


extension BloomStandard {
    /// Stores the user device APNs Token in the user's document directory.
    ///
    /// - Parameter token: The specific device token to be stored as a `String`.
    func storeToken(token: String?) async {
            struct FirebaseDocumentTokenData: Codable {
                let apnsToken: String?
            }
            
            do {
                let userDocument = try await userDocumentReference.getDocument()
                if userDocument.exists {
                    let existingTokenData = try await userDocumentReference.getDocument(as: FirebaseDocumentTokenData.self)
                    
                    // Unwrap existingTokenData.apns_token and provide a default value if it's nil
                    if existingTokenData.apnsToken != nil {
                        if existingTokenData.apnsToken != token {
                            try await userDocumentReference.updateData(["apnsToken": token ?? ""])
                        }
                    }
                    // user currently doesn't have apns token, must initialize a new field
                    else {
                        try await userDocumentReference.setData(["apnsToken": token ?? ""], merge: true)
                    }
                }
            } catch {
                print("Error retrieving user document: \(error)")
            }
        }

    /// Stores the timestamp when a notification was received by
    /// the user's device to the specific notification document.
    ///
    /// - Parameter timeSent: The time which the notification was sent, used for the path in Firestore.
    /// - Parameter timeReceived: The time which the notification was received, generated when the notification is delivered.
    func addNotificationReceivedTimestamp(timeSent: String, timeReceived: String) async {
        await addNotificationTimestamp(timeSent: timeSent, timestampKey: "received", timestampValue: timeReceived)
    }

    /// Stores the timestamp when a notification was opened by
    /// the user's device to the specific notification document.
    ///
    /// - Parameter timeSent: The time which the notification was sent, used for the path in Firestore.
    /// - Parameter timeOpened: The time which the notification was opened, generated when the user opens the notification.
    func addNotificationOpenedTimestamp(timeSent: String, timeOpened: String) async {
        await addNotificationTimestamp(timeSent: timeSent, timestampKey: "opened", timestampValue: timeOpened)
    }

    /// Generic method to store a timestamp for notifications in Firestore.
    ///
    /// - Parameters:
    ///   - timeSent: The time which the notification was sent, used for the path in Firestore.
    ///   - timestampKey: The key for the timestamp field (e.g., "received" or "opened").
    ///   - timestampValue: The value of the timestamp to store.
    private func addNotificationTimestamp(timeSent: String, timestampKey: String, timestampValue: String) async {
        // Define the Firestore path based on timeSent
        let path: String
        do {
            path = try await Firestore.getPath(module: .notifications("logs")) + "\(timeSent)"
        } catch {
            print("Failed to define path: \(error.localizedDescription)")
            return
        }

        // Try pushing the timestamp to Firestore
        do {
            try await Firestore.firestore().document(path).setData([timestampKey: timestampValue], merge: true)
            print("\(timestampKey.capitalized) timestamp stored successfully")
        } catch {
            print("Failed to set \(timestampKey) timestamp in Firestore: \(error.localizedDescription)")
        }
    }
}
