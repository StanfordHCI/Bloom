import React, { useState } from 'react';
import {
  TextInput,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  View,
  SafeAreaView,
} from 'react-native';
import { useTheme } from "../../context/ThemeContext";
import { errorCodeToMessage, useAuth, userFixableErrorCodes } from "../../context/AuthContext";
import { FirebaseError } from 'firebase/app';
import OnboardingButton from '../onboarding/OnboardingButton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface SignInProps {
  navigateSignUp: () => void;
  completeStep: () => Promise<void>;
}

const SignIn: React.FC<SignInProps> = ({navigateSignUp, completeStep}) => {
  const { signIn } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [emailError, setEmailError] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSignIn = async () => {
    console.log("Signing in with email:", email)
    setIsLoading(true);
    try {
      await signIn(email, password);
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
        Alert.alert("Error During Sign In", errorMessage);
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
        <View style={theme.onboarding.middleSection}>
          <Text style={[
            theme.typography.h1,
            { marginBottom: 40 },
          ]}>
            Sign In
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
            onPress={() => navigateSignUp()}
          >
            <Text>
              Don't have an account? <Text style={{ color: theme.colors.primary }}>Sign up instead</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.buttonContainer}>
        <OnboardingButton
          onPress={() => !isLoading && void handleSignIn()}
          label="Sign In"
          disabled={isLoading}
          isLoading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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

export default SignIn;
