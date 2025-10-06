//
//  NextWorkoutLockWidget.swift
//  Bloom
//
//  Created by Matthew Jörke on 2/7/25.
//

import SwiftUI
import WidgetKit

struct NextWorkoutLockEntry: TimelineEntry {
    let date: Date
    let heading: String
    let dateString: String
    let workoutString: String
    let workoutTypeSymbol: String
}

struct NextWorkoutLockProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextWorkoutLockEntry {
        NextWorkoutLockEntry(
            date: Date(),
            heading: "Next Workout",
            dateString: "Today at 3PM",
            workoutString: "Running | 30min",
            workoutTypeSymbol: "figure.run"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (NextWorkoutLockEntry) -> Void) {
        let entry = NextWorkoutLockEntry(
            date: Date(),
            heading: "Next Workout",
            dateString: "Mon at 2PM",
            workoutString: "Yoga | 45min",
            workoutTypeSymbol: "figure.yoga"
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextWorkoutLockEntry>) -> Void) {
        let data = loadSharedWidgetData()
        
        guard let next = data?.nextWorkout else {
            // No upcoming workout
            let noWorkoutEntry = NextWorkoutLockEntry(
                date: Date(),
                heading: "Next Workout",
                dateString: "",
                workoutString: "No workout found",
                workoutTypeSymbol: ""
            )
            let timeline = Timeline(entries: [noWorkoutEntry], policy: .atEnd)
            completion(timeline)
            return
        }

        let heading = "Next Workout"
        let dateLine: String
        let workoutLine: String
        
        if next.dayName.isEmpty || next.timeString.isEmpty {
            dateLine = ""
        } else {
            dateLine = "\(next.dayName) at \(next.timeString)"
        }
        
        if next.durationMin == 0 || next.type.isEmpty {
            workoutLine = ""
        } else {
            workoutLine = "\(next.type.capitalized) | \(next.durationMin)min"
        }
        let symbolName = systemSymbol(for: next.type)

        let entry = NextWorkoutLockEntry(
            date: Date(),
            heading: heading,
            dateString: dateLine,
            workoutString: workoutLine,
            workoutTypeSymbol: symbolName
        )
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
}

struct NextWorkoutLockWidgetEntryView: View {
    let entry: NextWorkoutLockEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(entry.heading)
                .fontWeight(.bold)
                .lineLimit(1)
            HStack(spacing: 3) {
                if !entry.workoutTypeSymbol.isEmpty {
                    Image(systemName: entry.workoutTypeSymbol)
                        .accessibilityHidden(true)
                        .frame(width: 16, height: 16)
                        .padding(.trailing, 4)
                }
                if entry.workoutString.isEmpty {
                    Text("No upcoming workouts")
                        .lineLimit(1)
                } else {
                    Text(entry.workoutString)
                        .lineLimit(1)
                }
            }
            if entry.dateString.isEmpty {
                Spacer()
            } else {
                HStack(spacing: 3) {
                    Image(systemName: "calendar")
                        .accessibilityHidden(true)
                        .frame(width: 16, height: 16)
                        .padding(.trailing, 4)
                    Text(entry.dateString)
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.vertical, 2)
        .widgetBackground {}
    }
}

struct NextWorkoutLockWidget: Widget {
    let kind: String = "NextWorkoutLockWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextWorkoutLockProvider()) { entry in
            NextWorkoutLockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Next Workout")
        .description("Shows the next workout in your plan.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct NextWorkoutLockWidget_Previews: PreviewProvider {
    static var previews: some View {
        NextWorkoutLockWidgetEntryView(
           entry: NextWorkoutLockEntry(
               date: Date(),
               heading: "Next Workout",
               dateString: "Mon | 2PM",
               workoutString: "Yoga for 45min",
               workoutTypeSymbol: "figure.yoga"
           )
        )
        .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
    }
}
