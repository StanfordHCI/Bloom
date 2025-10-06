import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep, useOnboarding } from "../context/OnboardingContext";
import SignIn from '../components/auth/SignIn';
const OnboardingSignIn: React.FC = () => {
  const { navigation, nextStepFrom } = useOnboarding();

  const completeStep = async () => {
    await nextStepFrom("SignIn");
  }

  return (
    <View style={styles.container}>
      <SignIn
        navigateSignUp={() => void navigation.current?.navigate('SignUp' as OnboardingStep)}
        completeStep={completeStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  }
});

export default OnboardingSignIn;
