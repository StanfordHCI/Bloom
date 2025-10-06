import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import { useTheme } from '../context/ThemeContext';
import { SFSymbol } from 'react-native-sfsymbols';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const NotificationPermissions: React.FC = () => {
  const { enableNotifications } = useOnboarding();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      await enableNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingHeaderFooter 
      title="Enable Notifications" 
      nextStep="NotificationPermissions"
      onBeforeNext={handleEnableNotifications}
      isLoading={isLoading}
      buttonLabel="Allow Notifications"
    >
      <AppText style={styles.introText}>
        This study will send to notifications to remind you about your scheduled workouts.
      </AppText>
      <AppText style={styles.introText}>
        You can choose to enable or disable notifications at any time through your device settings.
      </AppText>
      <SFSymbol
        name={"bell.badge.fill"}
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

export default NotificationPermissions;
