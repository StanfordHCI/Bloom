import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import AppText from '../components/AppText';
import QACard from '../components/QACard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Motivation = () => {
  const { nextStepFrom } = useOnboarding();

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <AppText style={styles.title}>Your Motivation 🎯</AppText>
      </View>

      <QACard
        data={{
          name: "longTermMotivation",
          Question: "When you think long-term, what kind of physical activity would you like to be able to do?",
          InputField: true,
          responseRequired: true,
        }}
        onNext={() => nextStepFrom("Motivation")}
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
  },
});

export default Motivation;
