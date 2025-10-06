//
//  BloomImageIntentExtension.swift
//  BloomImageIntent
//
//  Created by Matthew Jörke on 2/13/25.
//

import AppIntents

@main
struct BloomImageIntentExtension: AppIntentsExtension {
    var body: some AppIntent {
        GenerateAmbientDisplayImageIntent()
    }
}
