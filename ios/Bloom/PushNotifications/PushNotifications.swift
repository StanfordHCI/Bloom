//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project.
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import Firebase
import FirebaseCore
import FirebaseMessaging
import OSLog
import Spezi
import SpeziNotifications
import SwiftUI


/// This file implements functions necessary for push notifications to be implemented within the Bloom application.
/// Includes methods for monitoring token refresh, using methods from the BloomStandard to upload them to a user's
/// collection in Firebase.
class BloomPushNotifications: NSObject, Module, NotificationHandler, NotificationTokenHandler,
                                 MessagingDelegate, UNUserNotificationCenterDelegate, EnvironmentAccessible {
    @Application(\.requestNotificationAuthorization) var requestNotificationAuthorization
    @StandardActor var standard: BloomStandard
    
    let logger = Logger(subsystem: "Bloom", category: "PushNotification")
    private var apnsToken: String?
    
    override init() {}
    
    func configure() {
        Messaging.messaging().delegate = self
    }
    
    func handleNotificationsAllowed() async throws {
        let authorizationProvided = try await requestNotificationAuthorization(options: [.alert, .badge, .sound])
        
        guard authorizationProvided else {
            logger.warning("Notification have not be provided.")
            return
        }
    }
    
    func receiveUpdatedDeviceToken(_ deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }
    
    /// Called when the user taps on a notification.
    func handleNotificationAction(_ response: UNNotificationResponse) async {
        NSLog("Received notification action: \(response.actionIdentifier)")

        if let sentTimestamp = response.notification.request.content.userInfo["sent_timestamp"] as? String {
            let openedTimestamp = Date().toISOFormat(timezone: TimeZone(abbreviation: "UTC"))
            await standard.addNotificationOpenedTimestamp(timeSent: sentTimestamp, timeOpened: openedTimestamp)
        } else {
            logger.info("Sent timestamp is not a string or is nil")
        }

        if let action = response.notification.request.content.userInfo["action"] as? String,
           let emitter = ReactNativeEventEmitter.shared {
            emitter.sendNotificationActionToReactNative(action)
        } else {
            logger.info("Error sending notification action: action is nil or not a string")
        }
    }
    
    /// Called when a notification is received while the app is in the foreground.
    func receiveIncomingNotification(_ notification: UNNotification) async -> UNNotificationPresentationOptions? {
        let receivedTimestamp = Date().toISOFormat(timezone: TimeZone(abbreviation: "UTC"))
        if let sentTimestamp = notification.request.content.userInfo["sent_timestamp"] as? String {
            await standard.addNotificationReceivedTimestamp(timeSent: sentTimestamp, timeReceived: receivedTimestamp)
        } else {
            logger.info("Sent timestamp is not a string or is nil")
        }
        
        return [.badge, .banner, .list, .sound]
    }
    
    /// Called when a remote notification is received while the app is in the background.
    func receiveRemoteNotification(_ remoteNotification: [AnyHashable: Any]) async -> BackgroundFetchResult {
        NSLog("Received remote notification: \(remoteNotification)")
        let receivedTimestamp = Date().toISOFormat(timezone: TimeZone(abbreviation: "UTC"))
        if let sentTimestamp = remoteNotification["sent_timestamp"] as? String {
            await standard.addNotificationReceivedTimestamp(timeSent: sentTimestamp, timeReceived: receivedTimestamp)
        } else {
            logger.info("Sent timestamp is not a string or is nil")
        }
            
        await WidgetManager.shared.updateWidgetsInBackground()
        
        return .newData
    }
    
    /// This function listens for token refreshes and updates the specific user token to Firestore.
    /// This callback is fired at each app startup and whenever a new token is generated.
    ///
    /// Token refreshes may occur when:
    /// - the app is restored on a new device
    /// - the user uninstalls/reinstall the app
    /// - the user clears app data.
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        // Update the token in Firestore:
        // The standard is an actor, which protects against data races and conforms to
        // immutable data practice. Therefore we get into new asynchronous context and execute
        self.apnsToken = fcmToken
        Task {
            await standard.storeToken(token: fcmToken)
        }
    }
    
    func verifyAndStoreAPNSToken() async throws -> Bool {
        let notificationCenter = UNUserNotificationCenter.current()
        let settings = await notificationCenter.notificationSettings()

        let currentOptions: UNAuthorizationOptions = [
            settings.alertSetting == .enabled ? .alert : [],
            settings.badgeSetting == .enabled ? .badge : [],
            settings.soundSetting == .enabled ? .sound : []
        ].reduce(into: []) { $0.formUnion($1) }

        if settings.authorizationStatus == .authorized && !currentOptions.isEmpty {
            logger.info("APNS token exists and all desired options are authorized")
            Task {
                await standard.storeToken(token: self.apnsToken)
                logger.info("APNS token stored successfully")
            }
            return true
        } else {
            logger.info("APNS token does not exist locally or desired options are not fully authorized")
            return false
        }
    }
}
