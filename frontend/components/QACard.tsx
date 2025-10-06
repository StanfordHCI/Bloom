import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import OnboardingButton from './onboarding/OnboardingButton';
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { firestore } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { STUDY_ID } from '../config';
import { TouchableWithoutFeedback, Keyboard } from 'react-native';

interface QACardProps {
  data: {
    name: string;
    Context?: string | null;
    Question: string | null;
    InputField: boolean;
    responseRequired?: boolean;
  };
  onNext: () => Promise<void>;
  savedCollectionPath: string;
}

const QACard: React.FC<QACardProps> = ({ data, onNext, savedCollectionPath }) => {
  const [inputValue, setInputValue] = useState('');
  const { theme } = useTheme();
  const { uid } = useAuth();

  const handlePress = async () => {
    console.log(`Result for step ${data.name}:`, inputValue);

    if (!uid) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}/${savedCollectionPath}/${data.name}`);

      await setDoc(userDocRef, {
        response: inputValue,
      }, { merge: true });

      console.log(`Stored QA data for ${data.name} in ${savedCollectionPath}`);
    } catch (error) {
      console.error("Error updating QA data", error);
    }

    setInputValue('');
    void onNext();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            {data.Context && (
              <Text style={[theme.typography.p, styles.headerText]}>
                {data.Context}
              </Text>
            )}
            {data.Question && (
              <Text style={[theme.typography.h3, styles.headerText]}>
                {data.Question}
              </Text>
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {data.InputField && (
              <TextInput
                style={styles.input}
                placeholder="Enter your answer"
                value={inputValue}
                onChangeText={setInputValue}
                multiline
                textAlignVertical="top"
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <OnboardingButton
              label="Next"
              onPress={() => { void handlePress(); }}
              variant="primary"
              disabled={data.responseRequired && inputValue.trim() === ''}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    marginTop: -20,
  },
  header: {
    marginBottom: 10,
  },
  headerText: {
    marginBottom: 10,
  },
  content: {
    flex: 1,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  footer: {},
});

export default QACard;
