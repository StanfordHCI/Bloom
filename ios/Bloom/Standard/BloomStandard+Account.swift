//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseAuth
import FirebaseFirestore
import Foundation


extension BloomStandard {
    // MARK: - User Document Reference
    /// Returns the Firestore user document reference for the current authenticated user.
    var userDocumentReference: DocumentReference {
        get async throws {
            do {
                guard let userUID = try? Auth.getUID() else {
                    logger.error("UID retrieval failed or user not authenticated.")
                    throw BloomAuthError.userNotAuthenticatedYet
                }
                let documentReference = Self.userCollection.document(userUID)
                logger.debug("Retrieved Firestore document reference: \(documentReference.path)")
                return documentReference
            } catch {
                logger.error("Error in userDocumentReference: \(error.localizedDescription)")
                throw error
            }
        }
    }

    // MARK: - Account State Handling
    /// Authorizes access to the Bloom keychain access group for the currently signed-in user.
    func authorizeAccessGroupForCurrentUser() async {
        guard let user = Auth.auth().currentUser else {
            logger.warning("No signed-in user.")
            return
        }

        let userUID = try? Auth.getUID() // Retrieve UID for potential logging or usage
        logger.debug("Authorizing access group for user UID: \(userUID ?? "unknown")")

        do {
            try Auth.auth().useUserAccessGroup(Constants.keyChainGroup)
            try await Auth.auth().updateCurrentUser(user)
        } catch let error as NSError {
            logger.error("Error changing user access group: \(error.localizedDescription)")
            try? Auth.auth().signOut() // Log out the user if access group sharing fails
        }
    }
    
    func setAccountTimestamp() async {
        let timestamp = Timestamp(date: Date())
        do {
            try await self.userDocumentReference.setData([
                "createdAt": timestamp
            ], merge: true)
            logger.debug("Added timestamp to user document")
        } catch {
            logger.error("Error updating document: \(error)")
        }
    }
}
