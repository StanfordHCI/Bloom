import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
} from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import { useSpeechRecognition } from "../../utils/useSpeechRecognition";
import { useTheme } from "../../context/ThemeContext";

type MessageType =
  | "message"
  | "stream"
  | "visualization"
  | "tool"
  | "acknowledgement"
  | "closing";

interface InputBarProps {
  sendMessage: (
    messageContent: string,
    type: MessageType,
    role: string
  ) => void;
  messagesInProcess: boolean;
  readyState: number;
}

const lineHeight = 20;

const InputBar: React.FC<InputBarProps> = ({
  sendMessage,
  messagesInProcess,
  readyState,
}) => {
  const { theme } = useTheme();

  const [inputValue, setInputValue] = useState("");
  const [inputHeight, setInputHeight] = useState(2 * lineHeight);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionErrorModalVisible, setConnectionErrorModalVisible] = useState(false);

  useEffect(() => {
    if (readyState === WebSocket.OPEN) {
      setConnectionErrorModalVisible(false);
    }
  }, [readyState]);

  const { startRecognition, stopRecognition } = useSpeechRecognition(
    (newTranscription) => {
      handleTranscription(newTranscription);
    }
  );

  const handleContentSizeChange = (
    contentWidth: number,
    contentHeight: number
  ) => {
    const maxHeight = 10 * lineHeight;
    setInputHeight(contentHeight > maxHeight ? maxHeight : contentHeight);
  };

  const handleTranscription = (newTranscription: string) => {
    if (newTranscription.trim() !== "") {
      setInputValue(newTranscription);
    }
  };

  const handleIconPress = () => {
    if (readyState !== WebSocket.OPEN) {
      console.log("Connection Error'")
      setConnectionErrorModalVisible(true);
      return;
    }
    if (isRecording) {
      stop();
    } else if (inputValue.trim().length > 0) {
      send();
    } else {
      record();
    }
  };

  const record = () => {
    setIsRecording(true);
    startRecognition();
  };

  const stop = () => {
    setIsRecording(false);
    stopRecognition();
  };

  const send = () => {
    if (!inputValue.trim()) return;

    sendMessage(inputValue.trim(), "message", "user");
    setTimeout(() => {
      setInputValue("");
    }, 100);
    setIsRecording(false);
    setInputHeight(2 * lineHeight);
  };

  const renderIcon = () => {
    if (isRecording) {
      return (
        <SFSymbol
          name="stop.circle.fill"
          weight="semibold"
          scale="large"
          color="red"
          style={styles.iconSize}
        />
      );
    }
    if (inputValue.trim().length === 0) {
      // Show waveform icon if input is empty
      return (
        <SFSymbol
          name="waveform"
          weight="semibold"
          scale="large"
          color="gray"
          style={styles.iconSize}
        />
      );
    }
    // Show send icon if input has text
    return (
      <SFSymbol
        name="arrow.up.circle.fill"
        weight="semibold"
        scale="large"
        color={
          (!messagesInProcess && readyState === WebSocket.OPEN)
            ? theme.colors.primary
            : "gray"
        }
        style={styles.iconSize}
      />
    );
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.chatBar }]}>
        <TextInput
          style={[
            styles.input,
            theme.typography.p,
            {
              height: inputHeight,
              minHeight: 2 * lineHeight,
            },
          ]}
          placeholder="Ask Beebo!"
          value={inputValue}
          onChangeText={(text) => {
            setInputValue(text);
          }}
          onContentSizeChange={({
            nativeEvent: {
              contentSize: { width, height },
            },
          }) => handleContentSizeChange(width, height)}
          multiline
          cursorColor={theme.colors.primary}
          selectionColor={theme.colors.primary}
        />

        <View style={styles.iconWrapper}>
          <TouchableOpacity
            onPress={handleIconPress}
            disabled={messagesInProcess}
            style={styles.iconContainer}
          >
            {renderIcon()}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for connection error */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={connectionErrorModalVisible}
        onRequestClose={() => setConnectionErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Connection Error</Text>
            <SFSymbol
              name="exclamationmark.triangle"
              weight="regular"
              scale="large"
              color="gray"
              style={styles.ErrorIcon}
            />

            <TouchableOpacity
              onPress={() => setConnectionErrorModalVisible(false)}
              style={[styles.dismissButton]}
            >
              <SFSymbol
                name="xmark"
                scale="large"
                color={theme.colors.inactiveDark}
                style={styles.xIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default InputBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end", // Align button to the bottom of the container
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderColor: "lightgray",
    borderWidth: 1,
    borderRadius: 20,
  },
  input: {
    flex: 1, // Make the input grow to take available space
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  iconWrapper: {
    justifyContent: "flex-end", // Keep the icon at the bottom of the container
    marginLeft: 8, // Space between input and button
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
  },
  iconSize: {
    width: 32,
    height: 32,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    marginBottom: 10,
  },
  ErrorIcon: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  dismissButtonText: {
    color: "white",
    fontSize: 16,
  },
  dismissButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    padding: 8,
  },
  dismissIcon: {
    width: 24,
    height: 24,
  },
  xIcon: {
    width: 24,
    height: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    fontSize: 14,
  },
});
