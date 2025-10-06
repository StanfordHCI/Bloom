import React, { useRef } from 'react';
import { View, Text, Alert } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import { useTheme } from "../context/ThemeContext";
import { TREATMENT_CODE, CONTROL_CODE } from '../config';
import { OtpInput } from "react-native-otp-entry";
import { useAuth } from '../context/AuthContext';

const StudyCode: React.FC = () => {
  const { nextStepFrom } = useOnboarding();
  const { theme } = useTheme();
  const { setIsControlState } = useAuth();
  const hasHandledCode = useRef(false);
    
  const handleEnterCode = (code: string) => {
    if (hasHandledCode.current) return;
    hasHandledCode.current = true;

    if (code === TREATMENT_CODE || code === CONTROL_CODE) {
      void setIsControlState(code === CONTROL_CODE);
      void nextStepFrom("StudyCode");
    } else {
      Alert.alert("Invalid code", "Please enter a valid study code.", [
        { text: 'OK', onPress: () => { hasHandledCode.current = false; } }
      ]);
    }
  }

  return (
    <View style={theme.onboarding.container}>
      <View style={theme.onboarding.middleSection}>
        <Text style={theme.typography.h3}>
          Please enter your study code!
        </Text>
        <View>
          <OtpInput numberOfDigits={4} onFilled={(text) => handleEnterCode(text)} />
        </View>
      </View>
    </View>
  );
};

export default StudyCode;
