import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  ScrollView,
  ImageBackground,
  Image,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { ChatMessage, MessageType, ToolCall } from "../../context/ChatContext";
import Message from "../../messages/Message";
import { STUDY_ID } from "../../config";
import { useTheme } from "../../context/ThemeContext";
import GradientBG from "../../assets/images/Gradient-BG.png";
import { handleToolCall } from "../../utils/ToolCall";
import BeeImage from "../../assets/images/Bee.png";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatViewStyles } from "./ChatView";

type ChatHistoryRouteProp = RouteProp<
  { ChatHistoryScreen: { sessionId: string } },
  "ChatHistoryScreen"
>;

const ReadOnlyChatView: React.FC = () => {
  const { params } = useRoute<ChatHistoryRouteProp>();
  const { uid } = useAuth();
  const { theme } = useTheme();

  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      if (!uid || !params.sessionId) return;
      setMessages([]);
      try {
        const ref = doc(
          firestore,
          `studies/${STUDY_ID}/users/${uid}/gpt-messages`,
          params.sessionId
        );
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          const data = snapshot.data() || {};
          type AnnotatedMessage = {
            id: string;
            content: string;
            role: string;
            type: MessageType;
            tool_calls: ToolCall[];
          };
          const annotatedMessages = (data.messages as AnnotatedMessage[]) || [];
          const converted: ChatMessage[] = annotatedMessages.map((am) => ({
            id: am.id,
            content: am.content,
            role: am.role,
            type: am.type,
            tool_calls: am.tool_calls,
          }));

          converted.forEach((msg) => {
            // The logic is:
            // 1. If the message is role 'tool' abd type 'message', it's not a GPT tool call, but a response.
            //  So it can either be the summary of visualization message or a plan-widget result.
            //  As we display plan-widget using the tool response, we add it here
            // 2. If the message is type 'tool', it is a GPT tool call, so we handle it, without allowing for response
            // 3. Otherwise it's just a regular message and get's added
            if (msg.role === 'tool' && msg.type === 'message') {
              try {
                const toolCall = JSON.parse(msg.content) as ToolCall;
                // check if it's a plan-widget tool call
                const expectedKeys = new Set(['message', 'revision_message', 'plan']);
                const actualKeys = new Set(Object.keys(toolCall));

                const areKeysEqual = expectedKeys.size === actualKeys.size &&
                  [...expectedKeys].every(key => actualKeys.has(key));
                if (areKeysEqual) {
                  const planWidgetMessage: AnnotatedMessage = {
                    type: 'plan-widget',
                    role: 'assistant',
                    content: JSON.stringify(toolCall),
                    tool_calls: [],
                    id: msg.id,
                  }
                  console.log("handleToolCall: ", toolCall);
                  addMessage(planWidgetMessage);
                }
              } catch (e) {
                console.error("Failed to parse tool call content:", e);
              }
            } else if (msg.type === 'tool') {
              console.log('Handle Tool Call: ', msg);
              const toolCall = msg.tool_calls?.at(0);
              if (toolCall) {
                void handleToolCall(toolCall, false, addMessage, msg.id);
              }
            } else {
              console.log('Add Message: ', msg);
              addMessage(msg);
            }
          })
        }
      } catch (error) {
        console.error("Failed to load session messages:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSession();
  }, [uid, params.sessionId]);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }

  if (loading) {
    return (
      <ImageBackground source={GradientBG} style={styles.background} resizeMode="cover">
        <View
          style={[
            styles.loadingContainer,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <ActivityIndicator size="large" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={GradientBG} style={styles.background} resizeMode="cover">
      <View style={{ flex: 1, paddingBottom: insets.bottom, paddingHorizontal: 8 }}>
        <FlatList
          inverted
          style={ChatViewStyles.chatContainer}
          contentContainerStyle={ChatViewStyles.scrollViewContent}
          data={messages.slice().reverse()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <>
              {item.type === "plan-widget" ? (
                <ScrollView
                  horizontal
                  style={{
                    borderRadius: 22,
                    marginBottom: 10,
                  }}
                  contentContainerStyle={{ flexGrow: 1 }}
                >
                  <View style={{ width: "100%" }}>
                    <Message type={item.type} content={item.content} role={item.role} />
                  </View>
                </ScrollView>
              ) : (
                <View
                  style={
                    item.role === "assistant" || item.type === "acknowledgement"
                      ? ChatViewStyles.systemMessageContainer
                      : { marginBottom: 10 }
                  }
                >
                  {(item.role === "assistant" || item.type === "acknowledgement") && (
                    <View style={ChatViewStyles.beeContainer}>
                      <View style={ChatViewStyles.beeCircle}>
                        <Image source={BeeImage} style={ChatViewStyles.beeImage} />
                      </View>
                    </View>
                  )}
                  <View
                    style={[
                      item.role === "user"
                        ? [ChatViewStyles.userMessage, { backgroundColor: theme.colors.chatMessageUserBackground }]
                        : [ChatViewStyles.systemMessage, 
                          item.type == "visualization" ? { } :
                          { backgroundColor: theme.colors.chatMessageSystemBackground }
                        ],
                      item.type === 'acknowledgement' ? { alignSelf: 'flex-start' } : {}
                    ]}
                  >
                    <Message 
                      type={item.type} 
                      content={item.content} 
                      role={item.role} 
                    />
                  </View>
                </View>
              )}
            </>
          )}
        />
      </View>
    </ImageBackground>
  );
};

export default ReadOnlyChatView;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  }
});