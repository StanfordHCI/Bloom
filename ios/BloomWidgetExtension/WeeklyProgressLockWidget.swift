//
//  WeeklyProgressLockWidget.swift
//  Bloom
//
//  Created by Matthew Jörke on 2/7/25.
//

import SwiftUI
import WidgetKit

struct WeeklyProgressLockEntry: TimelineEntry {
    let date: Date
    let progress: Double
}

struct WeeklyProgressLockProvider: TimelineProvider {
    func placeholder(in context: Context) -> WeeklyProgressLockEntry {
        WeeklyProgressLockEntry(date: Date(), progress: 0.0)
    }

    func getSnapshot(in context: Context, completion: @escaping (WeeklyProgressLockEntry) -> Void) {
        let entry = WeeklyProgressLockEntry(date: Date(), progress: 0.5)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeeklyProgressLockEntry>) -> Void) {
        // read from JSON
        let data = loadSharedWidgetData()
        let progressValue = data?.weeklyProgress ?? 0.0
        
        let entry = WeeklyProgressLockEntry(date: Date(), progress: progressValue)
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
}

struct WeeklyProgressLockWidgetEntryView: View {
    let entry: WeeklyProgressLockEntry
    
    // 5 leaves for 20% increments
    private let totalLeaves = 5
    // spacing between leaves
    private let spacing: CGFloat = 3

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Weekly Progress")
                .padding(.bottom, 4)
                .fontWeight(.bold)
                .lineLimit(1)
            
            GeometryReader { geo in
                let totalSpacing = spacing * CGFloat(totalLeaves - 1)
                let leafWidth = (geo.size.width - totalSpacing) / CGFloat(totalLeaves)
                let leafHeight = geo.size.height
                
                // Convert progress => how many leaves are partially/fully filled
                let progressInLeaves = entry.progress * Double(totalLeaves)

                HStack(alignment: .center, spacing: spacing) {
                    ForEach(0..<totalLeaves, id: \.self) { leafIndex in
                        let fill = clampFill(progressInLeaves - Double(leafIndex))
                        LeafView(
                            fill: fill,
                            leafSize: min(leafWidth, leafHeight)
                        )
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetBackground {}
    }

    private func clampFill(_ value: Double) -> CGFloat {
        CGFloat(min(max(value, 0), 1))
    }
}

struct LeafView: View {
    let fill: CGFloat     // 0..1
    let leafSize: CGFloat

    var body: some View {
        ZStack(alignment: .leading) {
            Image("LeafInactive")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: leafSize, height: leafSize)
                .accessibilityHidden(true)

            Image("LeafActiveGreen")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: leafSize, height: leafSize)
                .accessibilityHidden(true)
                .mask(
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .frame(width: leafSize * fill)
                    }
                    .frame(width: leafSize, height: leafSize, alignment: .leading)
                )
        }
        // 4) Make sure the container is also left‐aligned
        .frame(width: leafSize, height: leafSize, alignment: .leading)
    }
}

struct WeeklyProgressLockWidget: Widget {
    let kind: String = "WeeklyProgressLockWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeeklyProgressLockProvider()) { entry in
            WeeklyProgressLockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Weekly Progress")
        .description("Displays your progress towards you weekly goal.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct WeeklyProgressLockWidget_Previews: PreviewProvider {
    static var previews: some View {
        WeeklyProgressLockWidgetEntryView(
            entry: WeeklyProgressLockEntry(date: Date(), progress: 0.5)
        )
        .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
    }
}
