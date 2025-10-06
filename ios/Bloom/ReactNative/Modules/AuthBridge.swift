//
//  AuthBridge.swift
//  Bloom
//
//  Created by Valentin Teutschbein on 29.12.24.
//

@objc(AuthBridge)
class AuthBridge: NSObject {
    @objc
    func signInWithCustomToken(_ token: String, isSignUp: Bool) {
        authModule.signInWithCustomToken(token, isSignUp: isSignUp)
    }
    
    @objc(isSignedIn:rejecter:)
    func isSignedIn(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(authModule.isSignedIn())
    }
}
