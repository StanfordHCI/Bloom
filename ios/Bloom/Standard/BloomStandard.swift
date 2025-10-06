//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseAuth
import FirebaseFirestore
import OSLog
import Spezi
import SpeziHealthKit
import SpeziHealthKitBulkExport
import SwiftUI


actor BloomStandard: Standard, ServiceModule, EnvironmentAccessible {
    /// Modify this study ID to change the Firebase bucket.
    static let STUDYID = Config.studyID
    
    /// Firebase Firestore user collection reference.
    static var userCollection: CollectionReference {
        Firestore.firestore().collection("studies").document(STUDYID).collection("users")
    }
    
    
    @Dependency(BulkHealthExporter.self) private var bulkHealthExporter
    @Dependency(HealthKit.self) private var healthKit
    @AppStorage(Constants.bulkExportComplete) var bulkExportComplete = false
    let logger = Logger(subsystem: "Bloom", category: "Standard")
    
    
    func run() async {
        guard !bulkExportComplete else {
            return
        }
        
        do {
            let session = try await bulkHealthExporter.session(
                withId: .backgroundExport,
                for: SampleTypesCollection(HealthKitSampleTypes.allHealthKitBulkUploadSampleTypes),
                startDate: .last(numMonths: 3),
                using: HealthKitFirebaseUploader()
            )
            
            guard await session.state != .completed, await session.state != .terminated else {
                bulkExportComplete = true
                return
            }
            
            withObservationTracking(
                {
                    if healthKit.isFullyAuthorized {
                        Task {
                            await initiateBulkUpload(with: session)
                        }
                    }
                },
                onChange: { [weak self] in
                    Task { @MainActor in
                        if await self?.healthKit.isFullyAuthorized ?? false {
                            await self?.initiateBulkUpload(with: session)
                        }
                    }
                }
            )
        } catch {
            logger.error("Error initiating bulk export session: \(error)")
        }
    }
    
    private func initiateBulkUpload(with session: any BulkExportSession<HealthKitFirebaseUploader>) async {
        do {
            for await _ in try await session.start() {
                await MainActor.run {
                    logger.info("Bulk export update: \(session.completedBatches.count) of \(session.numTotalBatches), failed: \(session.failedBatches.count)")
                }
            }
            if await session.state == .completed {
                bulkExportComplete = true
            }
        } catch {
            logger.error("Failed to complete bulk export: \(error)")
        }
    }
}
