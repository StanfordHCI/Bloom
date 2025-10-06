//
//  WidgetHelpers.swift
//  Bloom
//
//  Created by Matthew Jörke on 2/7/25.
//

import Foundation
import SwiftUI
import WidgetKit

struct WidgetDataModel: Codable {
    let weeklyProgress: Double
    let nextWorkout: NextWorkoutInfo
}

struct NextWorkoutInfo: Codable {
    let dayName: String
    let timeString: String
    let type: String
    let durationMin: Int
}

/// Load shared data from "widget_data.json", if used by the smaller widgets.
func loadSharedWidgetData() -> WidgetDataModel? {
    let appGroupID = "group.bloom.widget"
    let fileName = "widget_data.json"
    
    guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else {
        return nil
    }
    let fileURL = containerURL.appendingPathComponent(fileName)
    
    do {
        let data = try Data(contentsOf: fileURL)
        let decoded = try JSONDecoder().decode(WidgetDataModel.self, from: data)
        return decoded
    } catch {
        // Log or handle error as needed
        return nil
    }
}

/// Load the ambient display image from the group container (ambient_display.png).
func loadAmbientImage() -> UIImage? {
    let appGroupID = "group.bloom.widget"
    let fileName = "ambient_display.jpg"
    
    guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else {
        return nil
    }
    let fileURL = containerURL.appendingPathComponent(fileName)
    return UIImage(contentsOfFile: fileURL.path)
}

func loadCroppedAmbientImage() -> UIImage? {
    guard let fullImage = loadAmbientImage() else {
        NSLog("Error fetching ambient display image. Falling back to default.")
        return nil
    }
    return cropImageToWidgetRatio(fullImage)
}

func cropImageToWidgetRatio(_ image: UIImage) -> UIImage? {
    // For a 1320×2868 original, we want to crop the region
    // to a 1320x1386 widget starting at (0, 1146).
    
    // That leaves 1146 pixels at the top, and 336 pixels at the bottom.
    // So we have:
    //   topCropRatio = 1146 / 2868
    //   bottomCropRatio = 336 / 2868
    
    let topCropRatio: CGFloat = 1146.0 / 2868.0
    let bottomCropRatio: CGFloat = 336.0 / 2868.0
    
    let originalWidth = image.size.width
    let originalHeight = image.size.height
    
    let topCropPixels = round(topCropRatio * originalHeight)
    let bottomCropPixels = round(bottomCropRatio * originalHeight)
    
    // The new height we want in the cropped image
    let newHeight = originalHeight - topCropPixels - bottomCropPixels
    
    guard newHeight > 0 else {
        NSLog("Invalid crop: newHeight is <= 0")
        return nil
    }
    
    let cropRect = CGRect(
        x: 0,
        y: topCropPixels,
        width: originalWidth,
        height: newHeight
    )

    guard let cgImage = image.cgImage?.cropping(to: cropRect) else {
        NSLog("Failed to crop image cgImage.")
        return nil
    }
    
    return UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
}

// Hotfix required for "Please use containerBackground API warning on device" error
// https://nemecek.be/blog/192/hotfixing-widgets-for-ios-17-containerbackground-padding
extension View {
    @ViewBuilder
    func widgetBackground<Background: View>(@ViewBuilder _ background: () -> Background) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self
                .containerBackground(for: .widget) {
                    background()
                }
        } else {
            self
                .background(background())
        }
    }
}
