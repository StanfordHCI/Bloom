//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseAuth
import os


enum BloomAuthError: Error {
    case userNotAuthenticatedYet
}

extension Auth {
    static let logger = Logger(subsystem: "Bloom", category: "FirebaseAuth")
    
    /// Retrieves the UID of the currently authenticated user.
    static func getUID() throws -> String {
        guard let firebaseUser = Auth.auth().currentUser else {
            logger.error("No user authenticated.")
            throw BloomAuthError.userNotAuthenticatedYet
        }
        logger.debug("Authenticated user UID: \(firebaseUser.uid)")
        return firebaseUser.uid
    }
}
