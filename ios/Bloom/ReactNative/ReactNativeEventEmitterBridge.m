//
//  ReactNativeEventEmitterBridge.m
//  Bloom
//
//  Created by Matthew Jörke on 8/26/24.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(ReactNativeEventEmitter, RCTEventEmitter)
RCT_EXTERN_METHOD(onReactNativeReady)
@end

@interface RCT_EXTERN_MODULE(AuthBridge, NSObject)
RCT_EXTERN_METHOD(signInWithCustomToken:(NSString *)token isSignUp:(BOOL)isSignUp)
RCT_EXTERN_METHOD(isSignedIn:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end

@interface RCT_EXTERN_MODULE(SpeechToTextModule, NSObject)
RCT_EXTERN_METHOD(startRecognition)
RCT_EXTERN_METHOD(stopRecognition)
@end

@interface RCT_EXTERN_MODULE(HealthKitModule, NSObject)
RCT_EXTERN_METHOD(query:(NSDictionary *)parameters resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getAuthorizedStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(fetchWorkouts:(NSString *)startDate endDate:(NSString *)endDate
                  resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end

@interface RCT_EXTERN_MODULE(NotificationBridge, NSObject)
RCT_EXTERN_METHOD(handleNotificationsAllowed:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(verifyAndStoreAPNSToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end

@interface RCT_EXTERN_MODULE(WidgetBridge, NSObject)
RCT_EXTERN_METHOD(
  getAmbientDisplayImage:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)
@end
