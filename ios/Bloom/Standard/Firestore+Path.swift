//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import FirebaseAuth
import FirebaseFirestore


extension Firestore {
    /// The Firestore path for a given `Module`.
    /// - Parameter module: The `BloomModule` that is requested.
    static func getPath(module: BloomModule) async throws -> String {
        guard let userUID = try? Auth.getUID() else {
            throw BloomAuthError.userNotAuthenticatedYet
        }
        // Construct the module path
        var moduleText: String
        switch module {
        case .questionnaire(let type):
            moduleText = "\(module.description)/\(type)"
        case .health(let type):
            moduleText = "\(module.description)/\(type.healthKitDescription)"
        case .notifications:
            // notifications for user, type either "logs" or "schedule"
            moduleText = "\(module.description)"
        }

        // studies/STUDY_ID/users/USER_ID/MODULE_NAME/SUB_TYPE/...
        return "studies/\(BloomStandard.STUDYID)/users/\(userUID)/\(moduleText)/"
    }
}
