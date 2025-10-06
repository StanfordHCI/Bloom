import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding } from "../context/OnboardingContext";
import QACard from '../components/QACard';
import AppText from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PastExperience: React.FC = () => {
  const { nextStepFrom } = useOnboarding();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const questions = [
    {
      name: "benefits",
      Context: null,
      Question: "What personal benefits do you hope to achieve from regular exercise?",
      InputField: true,
      responseRequired: true
    },
    {
      name: "motivation",
      Context: null,
      Question: "What is motivating you to begin an exercise program now?",
      InputField: true,
      responseRequired: true
    },
    {
      name: "pastExperience",
      Context: null,
      Question: "Tell me about your experiences doing exercise in the past. What types of activities did you do and how long did you do them for?",
      InputField: true,
      responseRequired: true
    },
    {
      name: "successFactors",
      Context: null,
      Question: "What worked well in your past routines?",
      InputField: true,
      responseRequired: true
    },
    {
      name: "challenges",
      Context: null,
      Question: "What difficulties did you encounter?",
      InputField: true,
      responseRequired: true
    }
  ];

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      await nextStepFrom("PastExperience");
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <AppText style={styles.title}>Past Experience</AppText>
      </View>

      <QACard
        data={questions[currentQuestionIndex]}
        onNext={handleNext}
        savedCollectionPath="onboarding"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 16,
    paddingTop: 45,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'HankenGrotesk-Bold',
  }
});

export default PastExperience;
