//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import FirebaseMessaging
import FirebaseStorage
import os
import Spezi
import SpeziHealthKit
import SpeziHealthKitBulkExport
import SwiftUI


let speziHealthKitModule: HealthKit = {
    HealthKit {
        for quantitySampleType in HealthKitSampleTypes.quantitySampleTypes {
            CollectSample(quantitySampleType, continueInBackground: true)
        }
        for categorySampleType in HealthKitSampleTypes.categorySampleTypes {
            CollectSample(categorySampleType, continueInBackground: true)
        }
        for otherSampleType in HealthKitSampleTypes.otherSampleTypes {
            CollectSample(otherSampleType, continueInBackground: true)
        }
    }
}()
let pushNotifications = BloomPushNotifications()
let authModule = AuthModule()


class BloomDelegate: SpeziAppDelegate {
    let logger = Logger(subsystem: "Bloom", category: "BloomDelegate")
    var window: UIWindow?
    
    
    override var configuration: Configuration {
        Configuration(standard: BloomStandard()) {
            if HKHealthStore.isHealthDataAvailable() {
                speziHealthKitModule
                BulkHealthExporter()
            }
            pushNotifications
            authModule
        }
    }
    
    
    override init() {
        super.init()
        
        FirebaseApp.configure()
        
        if Config.useFirebaseEmulator {
            Auth.auth().useEmulator(withHost: Config.firebaseEmulatorHost, port: Config.firebaseAuthEmulatorPort)
            
            let settings = Firestore.firestore().settings
            settings.host = "\(Config.firebaseEmulatorHost):\(Config.firebaseFirestoreEmulatorPort)"
            settings.cacheSettings = MemoryCacheSettings()
            settings.isSSLEnabled = false
            Firestore.firestore().settings = settings
            
            let storage = Storage.storage()
            storage.useEmulator(withHost: Config.firebaseEmulatorHost, port: Config.firebaseStorageEmulatorPort)
        }
    }
    
    
    override func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any]
    ) async -> UIBackgroundFetchResult {
        logger.info("Got a silent push with userInfo \(userInfo)")
        return await pushNotifications.receiveRemoteNotification(userInfo)
    }
}
