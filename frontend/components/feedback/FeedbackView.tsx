import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import * as Sentry from "@sentry/react-native";
import { UserFeedback } from "@sentry/react-native";

interface FeedbackViewProps {
  feedbackContext: string;
  uid: string | null;
  onCancel: () => void;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({
  feedbackContext,
  uid,
  onCancel,
}) => {
  const [feedbackText, setFeedbackText] = useState("");

  const submitFeedback = () => {
    console.log("Submitting feedback to Sentry");

    try {
      const context = feedbackContext || "No context available";

      const sentryId = Sentry.captureMessage("user submitted feedback");

      const userFeedback: UserFeedback = {
        event_id: sentryId,
        comments: `User submitted feedback:\n\n ${feedbackText}\n\n in context:\n\n ${context}`,
        name: uid || "unknown user",
        email: "",
      };

      Sentry.captureUserFeedback(userFeedback);
      onCancel();
    } catch (error) {
      console.error("Error while submitting feedback:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Provide Feedback</Text>
      <TextInput
        style={styles.input}
        value={feedbackText}
        onChangeText={setFeedbackText}
        placeholder="Type your feedback here"
        multiline
      />
      <View style={styles.buttons}>
        <Button title="Cancel" onPress={onCancel} />
        <Button title="Submit" onPress={submitFeedback} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    width: "100%",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "gray",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    width: "100%",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default FeedbackView;
