import { useEffect } from "react";
import { NativeModules } from "react-native";
import { eventEmitter } from "./EventEmitter";

interface SpeechToTextModuleType {
  startRecognition: () => void;
  stopRecognition: () => void;
}

interface TranscriptionEvent {
  transcription: string;
}

const { SpeechToTextModule } = NativeModules as {
  SpeechToTextModule: SpeechToTextModuleType;
};

export function useSpeechRecognition(onTranscription: (text: string) => void) {
  useEffect(() => {
  const subscription = eventEmitter.addListener(
    "onTranscriptionReceived",
    (event: TranscriptionEvent) => {
    onTranscription?.(event.transcription);
    }
  );
  return () => {
    subscription.remove();
  };
  }, [onTranscription]);

  const startRecognition = () => {
  if (SpeechToTextModule?.startRecognition) {
    SpeechToTextModule.startRecognition();
  } else {
    console.error("SpeechToTextModule.startRecognition is not available.");
  }
  };

  const stopRecognition = () => {
  if (SpeechToTextModule?.stopRecognition) {
    SpeechToTextModule.stopRecognition();
  } else {
    console.error("SpeechToTextModule.stopRecognition is not available.");
  }
  };

  return { startRecognition, stopRecognition };
}
