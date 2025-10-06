import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  ListRenderItem,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  SafeAreaView,
  Image,
} from "react-native";
import { useChat, ChatMessage } from "../../context/ChatContext";
import { useTheme } from "../../context/ThemeContext";
import InputBar from "./InputBar";
import Message from "../../messages/Message";
import { useAuth } from "../../context/AuthContext";
import FeedbackView from "../feedback/FeedbackView";
import BeeImage from "../../assets/images/Bee.png";

const MemoMessage = React.memo(Message, (prevProps, nextProps) => {
  return (
    prevProps.type === nextProps.type &&
    prevProps.content === nextProps.content
  );
});

const ChatView = () => {
  const { theme } = useTheme();
  const {
    chatMessages,
    handleSendMessage,
    messagesInProcess,
    readyState,
  } = useChat();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackContext, setFeedbackContext] = useState<ChatMessage | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const { uid } = useAuth();

  const lastMessageRef = useRef<ChatMessage | null>(null);

  // This effect runs whenever chatMessages changes.
  // We check if the last message is new or its content has changed.
  useEffect(() => {
    const newLastMessage = chatMessages[chatMessages.length - 1];
    if (
      newLastMessage &&
      (!lastMessageRef.current ||
        newLastMessage.id !== lastMessageRef.current.id ||
        newLastMessage.content !== lastMessageRef.current.content)
    ) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    lastMessageRef.current = newLastMessage;
  }, [chatMessages]);

  const handleLongPress = (msg: ChatMessage) => {
    setFeedbackContext(msg);
    setFeedbackVisible(true);
  };

  const renderItem: ListRenderItem<ChatMessage> = useCallback(({ item }) => {
    return (
      <>
        {item.type === 'plan-widget' ? (
          <ScrollView
            horizontal
            style={{
              borderRadius: 22,
              marginBottom: 10,
            }}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ width: '100%' }}>
              <MemoMessage
                type={item.type}
                content={item.content}
                role={item.role}
                onLongPress={() => handleLongPress(item)}
              />
            </View>
          </ScrollView>
        ) : (
          <View
            style={
              item.role === "assistant" || item.type === "acknowledgement"
                ? styles.systemMessageContainer
                : { marginBottom: 10 }
            }
          >
            {(item.role === "assistant" || item.type === "acknowledgement") && (
              <View style={styles.beeContainer}>
                <View style={styles.beeCircle}>
                  <Image source={BeeImage} style={styles.beeImage} />
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
              <MemoMessage
                type={item.type}
                content={item.content}
                role={item.role}
                onLongPress={() => handleLongPress(item)}
              />
            </View>
          </View>
        )}
      </>
    );
  }, [theme, messagesInProcess]);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <FlatList
            inverted
            ref={flatListRef}
            style={styles.chatContainer}
            data={chatMessages.slice().reverse()}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.scrollViewContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
          <InputBar
            sendMessage={(content) => handleSendMessage(content, "message", "user")}
            messagesInProcess={messagesInProcess}
            readyState={readyState}
          />
          {feedbackVisible && (
            <Modal
              visible={feedbackVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setFeedbackVisible(false)}
            >
              <View style={styles.modalContainer}>
                <FeedbackView
                  feedbackContext={JSON.stringify(feedbackContext)}
                  uid={uid}
                  onCancel={() => setFeedbackVisible(false)}
                />
              </View>
            </Modal>
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: "98%",
  },
  container: {
    flex: 1,
    width: "100%"
  },
  chatContainer: {
    flex: 1,
    marginBottom: 10,
    marginTop: 10,
  },
  userMessage: {
    marginBottom: 10,
    alignSelf: "flex-end",
    flexShrink: 1,
    borderRadius: 22,
    marginLeft: "8%",
  },
  systemMessage: {
    flexShrink: 1,
    borderRadius: 22,
    marginRight: "8%",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "flex-end"
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 40,
  },
  systemMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  beeContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  beeCircle: {
    width: 36,
    height: 36,
    borderRadius: 36,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  beeImage: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
});

export default ChatView;
export const ChatViewStyles = styles;
