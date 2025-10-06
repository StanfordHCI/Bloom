//
//  ReactNativeConfig.swift
//  Bloom
//
//  Created by Matthew Jörke on 11/6/24.
//

enum Config {
    static let appEnv: String = RNCConfig.env(for: "APP_ENV") ?? "local"
    
    static let studyID: String = RNCConfig.env(for: "STUDY_ID") ?? "default"
    
    static let useFirebaseEmulator: Bool = RNCConfig.env(for: "USE_FIREBASE_EMULATOR") == "true"
    
    static let frontendURL: String = {
        if appEnv == "local" {
            return "http://localhost"
        } else if appEnv == "device" {
            let localIP = RNCConfig.env(for: "LOCAL_IP") ?? "localhost"
            return "http://\(localIP)"
        } else if appEnv == "production" {
            return "" // We do not use a frontend URL in production
        } else {
            return "http://localhost"
        }
    }()
    static let frontendPort: String = RNCConfig.env(for: "FRONTEND_PORT") ?? "8081"
    
    static let backendPort: String = RNCConfig.env(for: "BACKEND_PORT") ?? "5001"
    
    static let backendURL: String = {
        if appEnv == "local" {
            return "http://localhost" + ":" + backendPort
        } else if appEnv == "device" {
            let localIP = RNCConfig.env(for: "LOCAL_IP") ?? "localhost"
            return "http://\(localIP)" + ":" + backendPort
        } else if appEnv == "production" {
            return RNCConfig.env(for: "BACKEND_URL") ?? ""
        } else {
            return "http://localhost"
        }
    }()
    
    static let firebaseEmulatorHost: String = {
        if appEnv == "local" {
            return "localhost"
        } else if appEnv == "device" {
            return RNCConfig.env(for: "LOCAL_IP") ?? "localhost"
        } else {
            return "localhost"
        }
    }()
    static let firebaseAuthEmulatorPort: Int = Int(RNCConfig.env(for: "FIREBASE_AUTH_EMULATOR_PORT")) ?? 9099
    static let firebaseFirestoreEmulatorPort: Int = Int(RNCConfig.env(for: "FIREBASE_FIRESTORE_EMULATOR_PORT")) ?? 8080
    static let firebaseStorageEmulatorPort: Int = Int(RNCConfig.env(for: "FIREBASE_STORAGE_EMULATOR_PORT")) ?? 9199
}
