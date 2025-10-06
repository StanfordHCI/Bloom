//
// This source file is part of the Stanford Bloom Application based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import XCTest


final class BloomUITests: XCTestCase {
    @MainActor
    func testAppLaunch() throws {
        let app = XCUIApplication()
        app.launch()
        
        sleep(2)
        
        XCTAssert(app.wait(for: .runningForeground, timeout: 1))
    }
}
