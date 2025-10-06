//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import SpeziHealthKit
import SpeziViews
import SwiftUI


struct BloomDebugView: View {
    @Environment(HealthKit.self) var healthKit
    @State var viewState: ViewState = .idle
    @AppStorage(Constants.bulkExportComplete) var bulkExportComplete = false
    
    
    var body: some View {
        Text("HealthKit Authozation State: \(String(healthKit.isFullyAuthorized))")
        AsyncButton("Request authozation", state: $viewState) {
            try await healthKit.askForAuthorization()
        }
            .viewStateAlert(state: $viewState)
        Text("Bulk export complete: \(String(bulkExportComplete))")
    }
}


#Preview {
    BloomDebugView()
}
