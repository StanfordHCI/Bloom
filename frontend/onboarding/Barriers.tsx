import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { useAuth } from "../context/AuthContext";
import { firestore } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { STUDY_ID } from '../config';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';
import "react-native-get-random-values";

const barriers = [
  'Feel discomfort',
  'Feel unmotivated',
  'No energy',
  'No time',
  'Feel sick',
  'Feel stressed',
  'Feel ashamed',
  'Feel unsafe',
  'Feel unsupported or alone',
  'Weather',
  'Other (explain)',
];

const Barriers: React.FC = () => {
  const [selectedBarrier, setSelectedBarrier] = useState(barriers[0]);
  const { uid } = useAuth();
  const [otherText, setOtherText] = useState('');

  const handleBarrierChange = (value: string) => {
    setSelectedBarrier(value);
  };

  const handleBeforeNext = async () => {
    if (!uid) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}/onboarding/barriers`);
      await setDoc(userDocRef, {
        physicalActivityBarrier: selectedBarrier === 'Other (explain)' 
          ? `Other: ${otherText}` 
          : selectedBarrier,
      }, { merge: true });
    } catch (error) {
      console.error("Error updating barrier data", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <OnboardingHeaderFooter
        title="Physical Activity Barriers"
        nextStep="Barriers"
        onBeforeNext={handleBeforeNext}
        buttonLabel="Continue"
        isLoading={selectedBarrier === 'Other (explain)' && otherText.trim() === ''}
      >
        <AppText style={styles.questionText}>
          What is your biggest obstacle for you to do physical activity?
        </AppText>
        <AppText style={styles.subText}>Choose one below:</AppText>

        <RadioButton.Group
          onValueChange={handleBarrierChange}
          value={selectedBarrier}
        >
          {barriers.map((barrier) => (
            <View key={barrier}>
              <View style={styles.radioItem}>
                <RadioButton.Android 
                  value={barrier} 
                  color="#248F2D"
                />
                <AppText style={styles.radioLabel}>{barrier}</AppText>
              </View>
              {barrier === 'Other (explain)' && selectedBarrier === barrier && (
                <View style={styles.otherInputContainer}>
                  <TextInput
                    style={styles.otherInput}
                    placeholder="Please explain"
                    value={otherText}
                    onChangeText={setOtherText}
                    multiline
                  />
                </View>
              )}
            </View>
          ))}
        </RadioButton.Group>
      </OnboardingHeaderFooter>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
    fontFamily: 'HankenGrotesk-Regular',
  },
  otherInputContainer: {
    paddingHorizontal: 16,
    paddingLeft: 40,
    marginBottom: 12,
  },
  otherInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    fontFamily: 'HankenGrotesk-Regular',
    minHeight: 80,
  },
  questionText: {
    fontSize: 18,
    marginBottom: 8,
    lineHeight: 26,
    fontFamily: 'HankenGrotesk-Regular',
  },
  subText: {
    fontSize: 16,
    marginBottom: 24,
    fontFamily: 'HankenGrotesk-Regular',
    color: '#666',
  },
});

export default Barriers;
