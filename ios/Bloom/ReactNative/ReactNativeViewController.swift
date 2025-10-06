//
//  ReactNativeViewController.swift
//  Bloom
//
//  Created by Shardul on 8/17/24.
//

import Firebase
import FirebaseAuth
import React
import UIKit

class ReactNativeViewController: UIViewController {
    var rootView: RCTRootView?
    var bridge: RCTBridge?
    private var cachedToken: String?
    private let jsCodeLocation: URL = {
        let isDev = (Config.appEnv == "local" || Config.appEnv == "device")
        os_log("Current environment: %{public}@", Config.appEnv)
        if isDev {
            guard let devURL = URL(string: "\(Config.frontendURL):\(Config.frontendPort)/index.bundle?platform=ios") else {
                fatalError("Could not create dev JS bundle URL")
            }
            return devURL
        } else {
            let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
            guard let productionBundleURL = bundleURL else {
                fatalError("main.jsbundle not found in the app bundle!")
            }
            return productionBundleURL
        }
    }()
    
    init() {
        super.init(nibName: nil, bundle: nil)
    }
    
    @available(*, unavailable, message: "This controller should not be initialized from a storyboard or XIB")
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        print("View did load")
        super.viewDidLoad()
        
        view.frame = UIScreen.main.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        
        guard let bridge = RCTBridge(
            bundleURL: jsCodeLocation,
            moduleProvider: {
                [ReactNativeEventEmitter()]
            },
            launchOptions: nil
        ) else {
            fatalError("Failed to initialize RCTBridge")
        }
        
        self.bridge = bridge
        
        let initialProperties: [String: Any] = [:]
        rootView = RCTRootView(
            bridge: bridge,
            moduleName: "BloomApp",
            initialProperties: initialProperties
        )

        if let rootView = rootView {
            rootView.frame = self.view.bounds
            rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            self.view.addSubview(rootView)
        }
    }

    private func fetchFirebaseIDToken(completion: @escaping (String?) -> Void) {
        Auth.auth().currentUser?.getIDToken { token, error in
            if let error = error {
                print("Failed to fetch ID token: \(error)")
                completion(nil)
            } else {
                completion(token)
            }
        }
    }

    func changeMessage(_ sender: Any) {
        updateReactNativeMessage("Updated message from Swift!")
    }

    func updateReactNativeMessage(_ message: String) {
        rootView?.appProperties = ["initialMessage": message]
    }
}
