//
//  SwiftToRNView.swift
//  Bloom
//
//  Created by Shardul on 8/17/24.
//

import React
import SwiftUI

struct ReactNativeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ReactNativeViewController {
        ReactNativeViewController()
    }
    
    func updateUIViewController(_ uiViewController: ReactNativeViewController, context: Context) {
        // No update necessary for this example
    }
}
