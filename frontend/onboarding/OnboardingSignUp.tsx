import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding, OnboardingStep } from "../context/OnboardingContext";
import SignUp from '../components/auth/SignUp';

const OnboardingSignUp: React.FC = () => {
  const { navigation, nextStepFrom } = useOnboarding();

  const completeStep = async () => {
    console.log("Completing step")
    await nextStepFrom("SignUp");
  }

  return (
    <View style={styles.container}>
      <SignUp
        navigateSignIn={() => void navigation.current?.navigate('SignIn' as OnboardingStep)}
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

export default OnboardingSignUp;
