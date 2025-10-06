import React, { useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ChatProvider, ChatState, useChat } from "../context/ChatContext";
import ChatView from "../components/chat/ChatView";
import ProgressBar from "../components/chat/ProgressBar";
import { useTheme } from '../context/ThemeContext';
import neutralBG from "../assets/images/Gradient-BG.png";
import { useCheckIn, CheckInStep } from "../context/CheckInContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const states = ["introduction", "health_status", "assessment", "compare_goals", "goal_setting", "counseling", "goodbye"];

const CheckInChat: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  if (!isFocused) { // this is required to ensure rendering after back navigation
    return null;
  }
  return (
    <ChatProvider chatState={ChatState.CheckIn}>
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

export default CheckInChat;

const ChatContainer: React.FC = () => {
  const { state } = useChat();
  const { theme } = useTheme();
  const { nextStepFrom, setAsyncCheckInStorage } = useCheckIn();

  useEffect(() => {
    if (state == "goodbye") {
      void setAsyncCheckInStorage("ScheduleCheckIn");
    }
  }, [state]);

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
          <View style={{ marginTop: 20, width: "100%" }}>
            <TouchableOpacity
              style={[
                theme.onboarding.button.container,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => void nextStepFrom("CheckInChat" as CheckInStep)}
            >
              <Text style={theme.onboarding.button.text}>Next</Text>
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
    padding: 10,
    paddingBottom: 0,
  },
  backgroundImage: {
    flex: 1,
  },
  keyboardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
});
