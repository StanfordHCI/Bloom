import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, SafeAreaView } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import beeIcon from '../assets/images/Bee.png';
import { useTheme } from "../context/ThemeContext";
import OnboardingButton from '../components/onboarding/OnboardingButton';

const ChatIntro: React.FC = () => {
  const { nextStepFrom } = useOnboarding();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[theme.onboarding.container, styles.safeArea]}>
      <View style={styles.mainContainer}>
        {/* Fixed Header */}
        <View style={[styles.header, styles.contentPadding]}>
          <Text style={[theme.typography.h3, styles.headerText]}>
            Let's Chat
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollContent} 
          contentContainerStyle={styles.scrollContentContainer}
        >
          <View style={[theme.onboarding.middleSection, styles.contentPadding]}>
            <Image
              source={beeIcon}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[theme.typography.p, { marginBottom: 20 }]}>
              Let's work together to create a <Text style={{ fontWeight: 'bold' }}>personalized exercise plan</Text> for you. Once you click 'Start Chatting,' I'll guide you through setting realistic goals and tracking your progress.
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Footer */}
        <View style={[styles.footer, styles.buttonContainer]}>
          <OnboardingButton
            // @ts-expect-error ChatIntro not wired up to nextStepFrom
            onPress={() => { void nextStepFrom("ChatIntro"); }}
            label="Let's chat!"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerText: {
    flexWrap: 'wrap',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  footer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  logo: {
    width: 180,
    height: 180,
    alignSelf: 'center',
  },
});

export default ChatIntro;
