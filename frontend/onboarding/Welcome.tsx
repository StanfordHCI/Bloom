import React from 'react';
import { View, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import main_screen from '../assets/images/main-screen.png';
import { useOnboarding } from '../context/OnboardingContext';
import { useTheme } from "../context/ThemeContext";
import OnboardingButton from '../components/onboarding/OnboardingButton';

const Welcome: React.FC = () => {
  const { nextStepFrom } = useOnboarding();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ImageBackground
        source={main_screen}
        style={{ flex: 1 }}
        resizeMode="cover"
      >

      <SafeAreaView style={[theme.onboarding.container, styles.safeArea]}>
        <View style={styles.buttonContainer}>
          <OnboardingButton
            label="Start"
            onPress={() => { void nextStepFrom("Welcome"); }}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    width: '100%',
  },
});

export default Welcome;