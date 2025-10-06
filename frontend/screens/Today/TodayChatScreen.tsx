import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, StyleSheet, Modal, TouchableOpacity, FlatList, ImageBackground } from "react-native";
import ChatView from "../../components/chat/ChatView";
import { ChatProvider, ChatState } from "../../context/ChatContext";
import { useAuth } from '../../context/AuthContext';
import { firestore } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { STUDY_ID } from '../../config';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationViews } from '../../navigation/AppNavigator';
import { DateTime } from 'luxon';
import AppText from '../../components/AppText';
import { useTheme } from "../../context/ThemeContext";
import { SFSymbol } from "react-native-sfsymbols";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';
import neutralBG from "../../assets/images/Gradient-BG.png";

interface SessionData {
  sessionId: string;    // the doc ID
  headline: string;     // the "headline" field from doc data
  chatState: ChatState; // the doc's chatState
  iso: string;          // the ISO date/time from sessionId
}

// Create a separate container component similar to OnboardingChat
const ChatContainer: React.FC<{
  setMenuVisible: (visible: boolean) => void;
}> = ({ setMenuVisible }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<NavigationViews>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 16 }} onPress={() => setMenuVisible(true)}>
          <SFSymbol
            name="clock.arrow.trianglehead.counterclockwise.rotate.90"
            weight="regular"
            scale="large"
            color={theme.colors.text}
            style={{ width: 24, height: 24 }}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, setMenuVisible]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 120: 0}
      >
        <ChatView />
      </KeyboardAvoidingView>
    </View>
  );
};

const TodayChatScreen: React.FC = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const { uid } = useAuth();
  const navigation = useNavigation<StackNavigationProp<NavigationViews>>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!uid) return;

    const fetchSessions = async () => {
      try {
        const colRef = collection(firestore, `studies/${STUDY_ID}/users/${uid}/gpt-messages`);
        const snapshot = await getDocs(colRef);

        const allSessions: SessionData[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {}
          const docId = docSnap.id; // e.g. "session-2025-01-28T00:41:34+00:00"
          const isoTime = docId.replace('session-', '');
          allSessions.push({
            sessionId: docId,
            headline: (data.headline as string) ?? docId,  // fallback to docId if missing
            chatState: (data.chatState as ChatState) || ChatState.AtWill,
            iso: isoTime,
          });
        });

        // 2) Sort descending by time
        allSessions.sort((a, b) => {
          const timeA = DateTime.fromISO(a.iso).toMillis();
          const timeB = DateTime.fromISO(b.iso).toMillis();
          return timeB - timeA;
        });

        // 3) Filter out "just-created" AtWill sessions
        //    E.g. if you want to exclude sessions from the last 2 hours
        const now = DateTime.now();
        const cutoff = now.minus({ hours: 2 }).toMillis();
        const filtered = allSessions.filter((session) => {
          const time = DateTime.fromISO(session.iso).toMillis();
          // only exclude if time > cutoff and it's AtWill
          return !(time > cutoff && session.chatState === ChatState.AtWill);
        });

        setSessions(filtered);
      } catch (error) {
        console.error("Error fetching session IDs:", error);
      }
    };

    void fetchSessions();
  }, [uid]);

  const formatLocalTime = (iso: string) => {
    const date = DateTime.fromISO(iso);
    if (!date.isValid) return iso;
    return date.toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY);
  };

  // Match the structure of OnboardingChat exactly
  return (
    <ChatProvider chatState={ChatState.AtWill}>
      <ImageBackground
        source={neutralBG}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={{
          paddingBottom: insets.bottom,
          flex: 1,
        }}>
          <ChatContainer setMenuVisible={setMenuVisible} />
        </View>
      </ImageBackground>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <AppText variant={'h3'} style={styles.modalTitle}>Past Chat Sessions</AppText>
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.sessionId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sessionItem}
                  onPress={() => {
                    setMenuVisible(false);
                    navigation.navigate('ChatHistoryScreen', { sessionId: item.sessionId });
                  }}
                >
                  <AppText style={styles.sessionId}>{item.headline}</AppText>
                  <AppText style={styles.sessionTime}>{formatLocalTime(item.iso)}</AppText>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setMenuVisible(false)}
            >
              <AppText style={styles.closeButtonText}>Close</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ChatProvider>
  );
};

export default TodayChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  modalTitle: {
    marginBottom: 12,
  },
  sessionItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    paddingVertical: 8,
  },
  sessionId: {
    fontWeight: 'bold',
  },
  sessionTime: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
});
