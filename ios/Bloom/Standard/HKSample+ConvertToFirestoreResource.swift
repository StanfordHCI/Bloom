//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseFirestore
import HealthKit
import HealthKitOnFHIR


extension HKSample {
    // Converts an HKSample to a Firestore-compatible resource and returns the path and resource dictionary
    func convertToFirestoreResource() async throws -> (path: String, resource: [String: Any]) {
        let effectiveTimestamp = startDate.toISOFormat()
        let path = try await Firestore.getPath(module: BloomModule.health(sampleType.identifier)) + "raw/\(effectiveTimestamp)"
        
        let deviceName = sourceRevision.source.name
        
        let resource = try resource()
        let encoder = FirebaseFirestore.Firestore.Encoder()
        var firestoreResource = try encoder.encode(resource)
        
        firestoreResource["device"] = deviceName
        firestoreResource["datetimeStart"] = effectiveTimestamp
        
        return (path, firestoreResource)
    }
}
