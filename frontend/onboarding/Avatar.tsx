import React from "react";
import { Image, StyleSheet } from "react-native";
import beeIcon from "../assets/images/Bee.png";
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const Avatar: React.FC = () => {
  return (
    <OnboardingHeaderFooter
      title="Meet Your Coach 🐝"
      nextStep="Avatar"
    >
      <AppText style={styles.introText}>
        Hi! I'm <AppText style={{ fontWeight: "bold", fontSize: 18 }}>Beebo</AppText>, here to help you stay active and achieve your fitness goals.
      </AppText>

      <Image source={beeIcon} style={styles.logo} resizeMode="contain" />

      <AppText style={styles.introText}>
        Each week, we'll check in, review your progress, and adjust your plan for the next week. This is your journey and I'm here to support you along the way!
      </AppText>
    </OnboardingHeaderFooter>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    marginVertical: 20,
  },
  introText: {
    fontSize: 18,
    marginBottom: 24,
    lineHeight: 26,
    fontFamily: 'HankenGrotesk-Regular',
  }
});

export default Avatar;
