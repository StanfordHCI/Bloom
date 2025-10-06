//
//  WidgetBridge.swift
//  Bloom
//
//  Created by Matthew Jörke on 1/18/25.
//

import FirebaseAuth
import Foundation
import React

@objc(WidgetBridge)
class WidgetBridge: NSObject {
    @objc
    func getAmbientDisplayImage(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WidgetManager.shared.performManualRefresh()
                if let base64 = try loadImageAsBase64() {
                    resolve(base64)
                } else {
                    resolve(nil)
                }
            } catch {
                reject("ERR_IMAGE", "Failed to fetch ambient image", error)
            }
        }
    }
    
    private func loadImageAsBase64() throws -> String? {
        let appGroupID = "group.bloom.widget"
        let filename = "ambient_display.jpg"
        
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupID
        ) else {
            return nil
        }
        let fileURL = containerURL.appendingPathComponent(filename)
        
        let data = try Data(contentsOf: fileURL)
        return data.base64EncodedString()
    }
}
