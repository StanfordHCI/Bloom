//
//  AmbientDisplayWidget.swift
//  AmbientDisplayWidget
//
//  Created by Matthew Jörke on 1/18/25.
//

import SwiftUI
import WidgetKit

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(SimpleEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let entry = SimpleEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct AmbientDisplayWidgetEntryView: View {
    let entry: Provider.Entry

    let appGroupID = "group.bloom.widget"
    let fileName = "ambient_display.png"

    var body: some View {
        ZStack {
        }
        .widgetBackground {
            backgroundView
        }
    }

    @ViewBuilder private var backgroundView: some View {
        if let uiImage = loadCroppedAmbientImage() {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFill()
                .clipped()
                .accessibilityLabel("A custom ambient display image.")
        } else {
            Image("EmptyBG")
                .resizable()
                .scaledToFill()
                .clipped()
                .accessibilityLabel("A custom ambient display image.")
        }
    }
}

struct AmbientDisplayWidget: Widget {
    let kind: String = "AmbientDisplayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            AmbientDisplayWidgetEntryView(entry: entry)
        }
        .supportedFamilies([.systemLarge])
        .configurationDisplayName("Your Garden")
        .description("Displays a growing garden.")
        .contentMarginsDisabled()
    }
}

struct AmbientDisplayWidget_Previews: PreviewProvider {
    static var previews: some View {
        AmbientDisplayWidgetEntryView(entry: SimpleEntry(date: .now))
            .previewContext(WidgetPreviewContext(family: .systemLarge))
    }
}
