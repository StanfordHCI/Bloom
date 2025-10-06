import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useOnboarding, OnboardingStep } from "../../context/OnboardingContext";
import OnboardingButton from './OnboardingButton';
import AppText from '../AppText';
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OnboardingHeaderFooterProps {
  title: string;
  nextStep: OnboardingStep;
  children: React.ReactNode;
  buttonLabel?: string;
  isLoading?: boolean;
  onBeforeNext?: () => Promise<void>;
}

const OnboardingHeaderFooter: React.FC<OnboardingHeaderFooterProps> = ({ 
  title, 
  nextStep,
  children,
  buttonLabel = "Continue",
  isLoading = false,
  onBeforeNext
}) => {
  const { nextStepFrom } = useOnboarding();
  const insets = useSafeAreaInsets();

  const handleNext = async () => {
    if (onBeforeNext) {
      await onBeforeNext();
    }
    void nextStepFrom(nextStep);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <AppText style={styles.title}>{title}</AppText>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.contentContainer}>
          {children}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <OnboardingButton
          label={buttonLabel}
          onPress={() => void handleNext()}
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
        />
      </View>
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
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'HankenGrotesk-Bold',
  }
});

export default OnboardingHeaderFooter; 