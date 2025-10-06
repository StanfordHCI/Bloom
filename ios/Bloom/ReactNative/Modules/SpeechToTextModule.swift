//
//  SpeechToTextModule.swift
//  Bloom
//
//  Created by Valentin Teutschbein on 22.09.24.
//

import AVFoundation
import Foundation
import Speech

@objc(SpeechToTextModule)
class SpeechToTextModule: NSObject {
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let recognizer = SFSpeechRecognizer()

    @objc
    func startRecognition() {
        SFSpeechRecognizer.requestAuthorization { authStatus in
            switch authStatus {
            case .authorized:
                self.setupRecognition()
            case .denied, .restricted, .notDetermined:
                print("Speech recognition authorization failed: \(authStatus)")
                return
            @unknown default:
                print("Speech recognition authorization failed: unknown error")
                return
            }
        }
    }
    
    private func setupRecognition() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("Error setting up audio session: \(error)")
            return
        }
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.request?.append(buffer)
        }
        
        request = SFSpeechAudioBufferRecognitionRequest()
        guard let recognizer = recognizer, recognizer.isAvailable, let request = request else {
            return
        }

        recognitionTask = recognizer.recognitionTask(with: request) { result, error in
            if let result = result {
                let transcription = result.bestTranscription.formattedString
                self.sendTranscriptionToReact(transcription: transcription)
            } else if let error = error {
                print("Recognition error: \(error)")
            }
        }
        
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            print("Audio engine couldn't start: \(error)")
        }
    }

    @objc
    func stopRecognition() {
        audioEngine.stop()
        request?.endAudio()
        recognitionTask?.cancel()
    }
    
    private func sendTranscriptionToReact(transcription: String) {
        DispatchQueue.main.async {
            ReactNativeEventEmitter.shared?.emitEvent(name: "onTranscriptionReceived", body: ["transcription": transcription])
        }
    }
}
