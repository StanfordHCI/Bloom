//
//  AuthModule.swift
//  Bloom
//
//  Created by Matthew Jörke on 10/8/24.
//

import Firebase
import FirebaseAuth
import Foundation
import OSLog
import Spezi

class AuthModule: NSObject, Module {
    @StandardActor var standard: BloomStandard
    
    let logger = Logger(subsystem: "Bloom", category: "AuthModule")
    
    override init() {
        super.init()
    }
    
    // Returns the user's UID if signed in, otherwise an empty string
    func isSignedIn() -> String {
        NSLog("AuthModule: Checking if user is signed in: \(Auth.auth().currentUser != nil)")
        let isSignedIn = Auth.auth().currentUser != nil
        if isSignedIn {
            return Auth.auth().currentUser?.uid ?? ""
        } else {
            return ""
        }
    }
        
    func signInWithCustomToken(_ token: String, isSignUp: Bool) {
//        self.logger.info("Custom token received: \(token)")
        NSLog("AuthModule: Signing in with custom token: \(token)")
            
        Auth.auth().signIn(withCustomToken: token) { authResult, error in
            if let error = error {
                NSLog("AuthModule: Error signing in with custom token: \(error.localizedDescription)")
                return
            }
            guard let user = authResult?.user else {
                NSLog("AuthModule: No user object returned after sign-in.")
                return
            }
            NSLog("AuthModule: User successfully signed in with Firebase: \(user.uid)")
            
            Task {
                NSLog("AuthModule: Authorizing access group for current user ...")
                await self.standard.authorizeAccessGroupForCurrentUser()
                
                if isSignUp {
                    NSLog("AuthModule: Setting account timestamp for new user ...")
                    await self.standard.setAccountTimestamp()
                }
            }
        }
    }

    
    func configure() {
        NSLog("AuthModule configured")
    }
}
