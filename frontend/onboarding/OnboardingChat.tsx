import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import ChatView from '../components/chat/ChatView';
import { ChatProvider, ChatState, useChat } from '../context/ChatContext';
import { useOnboarding } from '../context/OnboardingContext';
import ProgressBar from '../components/chat/ProgressBar';
import neutralBG from "../assets/images/Gradient-BG.png";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const states = [
  'introduction',
  'program',
  'past_experience',
  'barriers',
  'motivation',
  'goal_setting',
  'advice',
  'goodbye'
];

const OnboardingChat: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  if (!isFocused) { // this is required to ensure rendering after back navigation
    return null;
  }

  return (
    <ChatProvider chatState={ChatState.Onboarding}>
      <ImageBackground
        source={neutralBG}
        style={styles.backgroundImage} 
        resizeMode="cover"
      >
        <View style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          flex: 1,
        }}>
          <ChatContainer />
        </View>
      </ImageBackground>
    </ChatProvider>
  );
};

const ChatContainer: React.FC = () => {
  const { state } = useChat();
  const { nextStepFrom } = useOnboarding();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 75 : 0}
      >
        <ProgressBar states={states} currentState={state} />
        <ChatView />
        {state === states[states.length - 1] && (
          <View style={{ marginTop: 20, width: '100%' }}>
            <TouchableOpacity
              style={[
                theme.onboarding.button.container,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => void nextStepFrom("OnboardingChat")}
            >
              <Text style={theme.onboarding.button.text}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    paddingBottom: 0,
  },
  keyboardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  backgroundImage: {
    flex: 1,
  }
});

export default OnboardingChat;
