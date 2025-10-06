import React from "react";
import { StyleSheet, Image } from "react-native";
import beeIcon from "../assets/images/Bee.png";
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const AvatarQuestions: React.FC = () => {
  return (
    <OnboardingHeaderFooter title="A Few Questions 🐝" nextStep="AvatarQuestions" buttonLabel="Let's do it!">
      <AppText style={styles.introText}>
        It's now time to answer some questions to help me understand your fitness journey.
      </AppText>
      <Image source={beeIcon} style={styles.logo} resizeMode="contain" />
      <AppText style={styles.introText}>
        Do you have <AppText style={{ fontWeight: "bold", fontSize: 18 }}>20 minutes</AppText> to answer some questions?
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
  },
});

export default AvatarQuestions;
