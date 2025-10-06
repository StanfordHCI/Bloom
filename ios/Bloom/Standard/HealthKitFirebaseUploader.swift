//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseAuth
import FirebaseFirestore
import HealthKit
import os
import SpeziHealthKit
import SpeziHealthKitBulkExport


struct HealthKitFirebaseUploader: BatchProcessor {
    let batchSize = 500
    let logger = Logger(subsystem: "Bloom", category: "FirebaseUploader")
    
    
    private func uploadBatch(documents: [(String, [String: Any])], retryCount: Int) async {
        do {
            let database = Firestore.firestore()
            let batch = database.batch()
            
            for (path, data) in documents {
                let docRef = database.document(path)
                batch.setData(data, forDocument: docRef)
            }

            try await batch.commit()
            logger.info("Batch write succeeded.")
        } catch {
            logger.error("Error writing batch: \(error)")
            if retryCount < 5 {
                let backoffTime = UInt64(pow(2.0, Double(retryCount))) * 1_000_000_000 // Exponential backoff in seconds
                logger.info("Retrying batch upload in \(backoffTime / 1_000_000_000) seconds...")
                try? await _Concurrency.Task.sleep(nanoseconds: backoffTime)
                await uploadBatch(documents: documents, retryCount: retryCount + 1)
            } else {
                logger.error("Reached maximum retry attempts for batch upload.")
            }
        }
    }
    
    func process<Sample>(_ samples: [Sample], of sampleType: SampleType<Sample>) async throws {
        let batchedSamples = stride(from: 0, to: samples.count, by: batchSize).map { startIndex in
            let endIndex = Swift.min(startIndex + batchSize, samples.count)
            return samples[startIndex..<endIndex]
        }
        
        for batchedSampleGroup in batchedSamples {
            let startTime = DispatchTime.now()
            
            var documentsToAdd: [(String, [String: Any])] = []
            await withTaskGroup(of: Optional<(String, [String: Any])>.self) { group in
                for sample in batchedSampleGroup {
                    group.addTask {
                        do {
                            return try await sample.convertToFirestoreResource()
                        } catch {
                            self.logger.error("Error converting sample to Firestore resource: \(error.localizedDescription)")
                            return nil
                        }
                    }
                }

                for await result in group {
                    if let result = result {
                        documentsToAdd.append(result)
                    }
                }
            }

            await uploadBatch(documents: documentsToAdd, retryCount: 0)
            
            let endTime = DispatchTime.now()
            let elapsedTime = endTime.uptimeNanoseconds - startTime.uptimeNanoseconds
            let minimumDuration: UInt64 = 1_200_000_000 // 1s = 1,000,000,000ns (with 0.2s buffer time)

            if elapsedTime < minimumDuration {
               let sleepDuration = minimumDuration - elapsedTime
               try? await _Concurrency.Task.sleep(nanoseconds: sleepDuration)
            }
        }
    }
}


extension BulkExportSessionIdentifier {
    static let backgroundExport = Self("bloom.background.export")
}
