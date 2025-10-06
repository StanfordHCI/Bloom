//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import React
import Spezi
import SwiftUI


@main
struct Bloom: App {
    static var enableDebugView = false
    
    
    @ApplicationDelegateAdaptor(BloomDelegate.self) var appDelegate
    
    
    var body: some Scene {
        WindowGroup {
            Group {
                if Bloom.enableDebugView {
                    BloomDebugView()
                } else {
                    ReactNativeView()
                }
            }
                .edgesIgnoringSafeArea(.all)
                .spezi(appDelegate)
        }
    }
}
