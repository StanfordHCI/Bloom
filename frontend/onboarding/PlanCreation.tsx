import React from "react";
import { View, StyleSheet } from "react-native";
import { useOnboarding } from "../context/OnboardingContext";
import "react-native-get-random-values";
import PlanCreationScreen from "../components/plan/PlanCreationScreen";
import AppText from "../components/AppText";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PlanCreation: React.FC = () => {
  const { nextStepFrom } = useOnboarding();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <AppText style={styles.title}>Create Your Plan</AppText>
        <AppText style={styles.explanation}>
          Add a workout under each day of the week that you'd like to exercise!
        </AppText>
      </View>

      <PlanCreationScreen
        goNext={() => { void nextStepFrom("PlanCreation") }}
        isOnboarding={true}
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
    paddingTop: 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'HankenGrotesk-Bold',
    marginBottom: 8,
  },
  explanation: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'HankenGrotesk-Regular',
  },
});

export default PlanCreation;
