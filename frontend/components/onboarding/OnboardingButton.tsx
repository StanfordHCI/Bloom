import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface OnboardingButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
  disabled?: boolean;
}

const OnboardingButton: React.FC<OnboardingButtonProps> = ({
  onPress,
  label,
  variant = 'primary',
  isLoading = false,
  disabled = false,
}) => {
  const { theme } = useTheme();

  const buttonStyle =
    variant === 'primary'
      ? { backgroundColor: theme.colors.primary }
      : { backgroundColor: theme.colors.tertiary };

  const textStyle =
    variant === 'primary'
      ? theme.onboarding.button.text
      : { ...theme.onboarding.button.text, color: theme.colors.primary };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyle,
        disabled && { backgroundColor: theme.colors.inactiveLight },
        { marginBottom: variant === 'primary' ? 10 : 0 },
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.inactiveLight} />
      ) : (
        <Text
          style={[
            textStyle,
            disabled && { color: theme.colors.textDisabled},
          ]}
          numberOfLines={0}
          adjustsFontSizeToFit={false}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 20,
  },
});

export default OnboardingButton;
