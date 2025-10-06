import React from "react";
import { Modal, View, StyleSheet, Text, TouchableWithoutFeedback, Keyboard } from "react-native";
import FeedbackView from "./FeedbackView";
import { useAuth } from "../../context/AuthContext";
import { useErrorModal } from "../../context/ErrorModalContext";

const ErrorModal = () => {
  const {
    isError,
    errorMessage,
    hideErrorModal,
  } = useErrorModal();

  const { uid } = useAuth();

  return (
    <Modal
      transparent
      visible={isError}
      animationType="fade"
      onRequestClose={hideErrorModal}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <Text style={styles.headline}>An error occurred</Text>
            {errorMessage && (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            )}
            <FeedbackView
              feedbackContext={errorMessage || ""}
              uid={uid}
              onCancel={hideErrorModal}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    width: "80%",
    maxWidth: 400,
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  headline: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorMessage: {
    color: "red",
    marginBottom: 20,
    textAlign: "center",
  },
  icon: {
    fontSize: 24,
  },
});

export default ErrorModal;
