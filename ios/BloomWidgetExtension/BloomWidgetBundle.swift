//
//  BloomWidgetBundle.swift
//  BloomWidgetExtension
//
//  Created by Matthew Jörke on 1/18/25.
//

import SwiftUI
import WidgetKit

@main
struct AmbientDisplayWidgetBundle: WidgetBundle {
    var body: some Widget {
        AmbientDisplayWidget()
        WeeklyProgressLockWidget()
        NextWorkoutLockWidget()
    }
}
