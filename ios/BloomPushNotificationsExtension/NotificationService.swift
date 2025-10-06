//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project.
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import Firebase
import FirebaseAuth
import FirebaseFirestore
import UserNotifications

/// This file implements an extension to the Notification Service class, which is used to upload timestamps to Firestore on receival of background notifications.
class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?
    
    override init() {
        super.init()
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
    }
    
    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        NSLog("NotificationService Extension received notification")
        do {
            try Auth.auth().useUserAccessGroup(Constants.keyChainGroup)
        } catch let error as NSError {
            NSLog("Error changing user access group: %@", error)
        }
        
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
        
        if let bestAttemptContent = bestAttemptContent {
            let path = request.content.userInfo["logs_path"] as? String ?? ""
            let receivedTimestamp = Date().toISOFormat(timezone: TimeZone(abbreviation: "UTC"))
            
            Firestore.firestore().document(path).setData([
                "received": receivedTimestamp
            ], merge: true)
            
            NSLog("NotificationService Extension uploading received notification to Firestore: \(receivedTimestamp)")
            
            contentHandler(bestAttemptContent)
        } else {
            NSLog("NotificationService Extension failed to upload received notification to Firestore")
        }
    }
    
    override func serviceExtensionTimeWillExpire() {
        // Called just before the extension will be terminated by the system.
        // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
