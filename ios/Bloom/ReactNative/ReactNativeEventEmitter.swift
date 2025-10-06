//
//  ReactNativeEventEmitter.swift
//  Bloom
//
//  Created by Matthew Jörke on 8/26/24.
//

import Foundation
import React

@objc(ReactNativeEventEmitter)
class ReactNativeEventEmitter: RCTEventEmitter {
    static var shared: ReactNativeEventEmitter?
    private var cachedEvents: [[String: Any]] = []
    private var hasListeners: Bool = false

    override init() {
        super.init()
        ReactNativeEventEmitter.shared = self
    }

    override static func requiresMainQueueSetup() -> Bool {
        true
    }

    override func supportedEvents() -> [String] {
        ["onAuthTokenReceived", "onTranscriptionReceived", "notificationOpened"]
    }

    override func startObserving() {
        hasListeners = true
        // Send any cached events
        for event in cachedEvents {
            sendEvent(withName: event["name"] as? String, body: event["body"])
        }
        cachedEvents.removeAll()
    }

    override func stopObserving() {
        hasListeners = false
    }
    
    func emitEvent(name: String, body: Any) {
        if hasListeners {
            sendEvent(withName: name, body: body)
        } else {
            cachedEvents.append(["name": name, "body": body])
        }
    }

    @objc
    func sendTokenToReactNative(_ token: String) {
        let event = ["name": "onAuthTokenReceived", "body": ["token": token]] as [String: Any]
        if hasListeners {
            sendEvent(withName: "onAuthTokenReceived", body: ["token": token])
        } else {
            cachedEvents.append(event)
        }
    }
    
    func sendNotificationActionToReactNative(_ action: String) {
        emitEvent(name: "notificationOpened", body: ["action": action])
    }
}
