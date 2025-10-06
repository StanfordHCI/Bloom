//
//  NotificationBridge.swift
//  Bloom
//
//  Created by Valentin Teutschbein on 29.12.24.
//

@objc(NotificationBridge)
class NotificationBridge: NSObject {
    @objc
    func handleNotificationsAllowed(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await pushNotifications.handleNotificationsAllowed()
                resolve("Notifications allowed and registered successfully")
            } catch {
                reject("NOTIFICATION_ERROR", "Failed to allow or register notifications", error)
            }
        }
    }
    
    @objc
    func verifyAndStoreAPNSToken(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            let result = try await pushNotifications.verifyAndStoreAPNSToken()
            resolve(result)
        }
    }
}
