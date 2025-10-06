import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import { useTheme } from '../context/ThemeContext';
import { SFSymbol } from 'react-native-sfsymbols';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const HealthKitPermissions: React.FC = () => {
  const { requestHealthKitPermissions } = useOnboarding();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleNextStep = async () => {
    setIsLoading(true);
    try {
      await requestHealthKitPermissions();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingHeaderFooter 
      title="Permission to Access Health Data" 
      nextStep="HealthKitPermissions"
      onBeforeNext={handleNextStep}
      isLoading={isLoading}
      buttonLabel="Allow Access"
    >
      <AppText style={styles.introText}>
        This study will need data from your Health app, which includes information about your physical activity, heart rate, and more in order to best support your fitness journey.
      </AppText>
      <AppText style={styles.introText}>
        This data is read from your iPhone, Apple Watch, or other wearable devices. You will be able to grant or deny access to this data in the following permissions screen.
      </AppText>
      <SFSymbol
        name={"heart.text.square.fill"}
        size={150}
        color={theme.colors.primary}
        style={styles.logo}
      />
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

export default HealthKitPermissions;
