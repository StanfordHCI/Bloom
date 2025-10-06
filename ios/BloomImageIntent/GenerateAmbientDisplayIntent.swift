//
//  GenerateAmbientDisplayIntent.swift
//  Bloom
//
//  Created by Matthew Jörke on 2/13/25.
//

import AppIntents
import UIKit

struct GenerateAmbientDisplayImageIntent: AppIntent {
    static var title: LocalizedStringResource = "Generate Lockscreen Image"
    static var description = IntentDescription(
        "Fetches your garden image and returns it for use in Shortcuts."
    )
    
    func perform() async throws -> some IntentResult & ReturnsValue<IntentFile> {
        // 1) Get or build your image data. For example, load from your shared container:
        guard let image = loadAmbientImageFromAppGroup() else {
            // If you can’t load an image, you can throw an error or return an empty file
            throw NSError(domain: "GenerateAmbientImageIntent", code: 404, userInfo: [NSLocalizedDescriptionKey: "No image found"])
        }
        
        // 2) Convert UIImage to Data
        guard let pngData = image.pngData() else {
            throw NSError(
                domain: "GenerateAmbientImageIntent",
                code: 500,
                userInfo: [
                    NSLocalizedDescriptionKey: "Failed to convert image to PNG data"
                ]
            )
        }
        
        // 3) Wrap it in an `IntentFile`. The `.png` type helps Shortcuts treat it as an image
        let file = IntentFile(data: pngData, filename: "ambient_display.png", type: .png)
        
        // 4) Return your result
        return .result(value: file)
    }

    private func loadAmbientImageFromAppGroup() -> UIImage? {
        let appGroupID = "group.bloom.widget"
        let filename = "ambient_display.jpg"
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupID
        ) else {
            return nil
        }
        let fileURL = containerURL.appendingPathComponent(filename)
        return UIImage(contentsOfFile: fileURL.path)
    }
}
