import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { RadioButton } from 'react-native-paper';
import { useCheckIn } from "../context/CheckInContext";
import AppText from "../components/AppText";
import { firestore } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { STUDY_ID } from "../config";
import { useAuth } from "../context/AuthContext";
import CheckInHeaderFooter from '../components/checkin/CheckInHeaderFooter';

const CheckInHealth: React.FC = () => {
  const { uid } = useAuth();
  const { nextStepFrom } = useCheckIn();
  const [hasSymptoms, setHasSymptoms] = useState('no');
  const [duringActivity, setDuringActivity] = useState('no');

  const handleNext = async () => {
    if (!uid) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const checkInRef = doc(firestore, 'studies', STUDY_ID, 'users', uid, 'check-ins', today);

      await setDoc(checkInRef, {
        healthCheck: {
          hasSymptoms,
          duringActivity: hasSymptoms === 'yes' ? duringActivity : 'na',
          timestamp: new Date().toISOString(),
        }
      }, { merge: true });

      console.log('Stored health check responses in Firebase');
      void nextStepFrom("CheckInHealth");
    } catch (error) {
      console.error("Error updating health check data:", error);
    }
  };

  return (
    <CheckInHeaderFooter
      title="Weekly Check-in"
      nextStep="CheckInHealth"
      onBeforeNext={handleNext}
    >
      <View style={styles.questionGroup}>
        <AppText style={styles.question}>
          Have you experienced any chest pains, difficulty breathing, or tingling in your hands or feet since our last check-in?
        </AppText>

        <RadioButton.Group
          onValueChange={value => setHasSymptoms(value)}
          value={hasSymptoms}
        >
          <View style={styles.radioItem}>
            <RadioButton.Android value="yes" color="#248F2D" />
            <AppText style={styles.radioLabel}>Yes</AppText>
          </View>
          <View style={styles.radioItem}>
            <RadioButton.Android value="no" color="#248F2D" />
            <AppText style={styles.radioLabel}>No</AppText>
          </View>
        </RadioButton.Group>
      </View>

      {hasSymptoms === 'yes' && (
        <View style={styles.questionGroup}>
          <AppText style={styles.question}>
            Did any of these symptoms occur during physical activity?
          </AppText>

          <RadioButton.Group
            onValueChange={value => setDuringActivity(value)}
            value={duringActivity}
          >
            <View style={styles.radioItem}>
              <RadioButton.Android value="yes" color="#248F2D" />
              <AppText style={styles.radioLabel}>Yes</AppText>
            </View>
            <View style={styles.radioItem}>
              <RadioButton.Android value="no" color="#248F2D" />
              <AppText style={styles.radioLabel}>No</AppText>
            </View>
          </RadioButton.Group>

          {duringActivity === 'yes' && (
            <View style={styles.warningContainer}>
              <AppText style={styles.warningText}>
                Based on your symptoms, it may not be safe for you to continue with your current activity. Please refrain from further physical activity until cleared by a professional or reach out to the research team at: stanford.physical.activity.study@gmail.com.
              </AppText>
            </View>
          )}
        </View>
      )}
    </CheckInHeaderFooter>
  );
};

const styles = StyleSheet.create({
  question: {
    fontSize: 18,
    marginBottom: 24,
    lineHeight: 26,
    fontFamily: 'HankenGrotesk-Regular',
  },
  questionGroup: {
    marginBottom: 24,
  },
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
  warningContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  warningText: {
    fontSize: 16,
    color: '#D32F2F',
    lineHeight: 24,
    fontFamily: 'HankenGrotesk-Medium',
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 8,
  },
});

export default CheckInHealth;
