import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  View,
  SafeAreaView,
} from 'react-native';
import { FirebaseError } from 'firebase/app';
import { errorCodeToMessage, useAuth, userFixableErrorCodes } from "../../context/AuthContext";
import { useTheme } from '../../context/ThemeContext';
import OnboardingButton from '../onboarding/OnboardingButton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface SignUpProps {
  navigateSignIn: () => void;
  completeStep: () => Promise<void>;
}

const SignUp: React.FC<SignUpProps> = ({navigateSignIn, completeStep}) => {
  const { signUp } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [emailError, setEmailError] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSignUp = async () => {
    console.log("Signing up with email:", email);
    setIsLoading(true);
    try {
      await signUp(email, password);
      await completeStep();
    } catch (error) {
      const errorCode = (error as FirebaseError)?.code || "";
      if (userFixableErrorCodes.has(errorCode)) {
        const errorMessage = errorCodeToMessage(errorCode);

        if (errorMessage.toLowerCase().includes("email")) {
          setEmailError(true);
        }
        if (errorMessage.toLowerCase().includes("password")) {
          setPasswordError(true);
        }
        Alert.alert("Error During Sign Up", errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[theme.onboarding.container, styles.safeArea]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[{ flexGrow: 1 }, styles.contentContainer]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
      >
        <View style={styles.centerContent}>
          <Text style={[
            theme.typography.h1,
            { marginBottom: 40, width: '100%', textAlign: 'center' },
          ]}>
            Create An Account
          </Text>

          <TextInput
            placeholder="Email"
            style={[styles.input, emailError && { borderColor: 'red' }]}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setEmailError(false);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            cursorColor={theme.colors.primary}
            selectionColor={theme.colors.primary}
          />

          <TextInput
            placeholder="Password"
            style={[styles.input, passwordError && { borderColor: 'red' }]}
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setPasswordError(false);
            }}
            cursorColor={theme.colors.primary}
            selectionColor={theme.colors.primary}
          />

          <TouchableOpacity
            onPress={() => navigateSignIn()}
          >
            <Text>
              Already have an account? <Text style={{ color: theme.colors.primary }}>Sign in instead</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.buttonContainer}>
        <OnboardingButton
          onPress={() => !isLoading && void handleSignUp()}
          label="Sign Up"
          disabled={isLoading}
          isLoading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ccc',
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    width: '100%',
  },
});

export default SignUp;
