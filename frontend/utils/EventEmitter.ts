// RN bridge to backend for token
import { NativeEventEmitter, NativeModules, NativeModule } from "react-native";

interface ReactNativeEventEmitterType extends NativeModule {
  onReactNativeReady?: () => void;
}

const { ReactNativeEventEmitter } = NativeModules as {
  ReactNativeEventEmitter: ReactNativeEventEmitterType;
};

const eventEmitter = new NativeEventEmitter(ReactNativeEventEmitter);

export { eventEmitter, ReactNativeEventEmitter };
