import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import useChatWebSocket from "../utils/useChatWebSocket";
import { SOCKET_URL } from "../config";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { handleToolCall } from '../utils/ToolCall';
import { useAuth } from "./AuthContext";
import captureError from '../utils/errorHandling';
import * as Sentry from '@sentry/react-native';

export enum ChatState {
  Onboarding = "onboarding",
  CheckIn = "check-in",
  AtWill = "at-will"
}

export type MessageType =
  | "message"
  | "stream"
  | "visualization"
  | "plan-widget"
  | "tool"
  | "acknowledgement"
  | "closing"
  | "progress";

export interface ChatMessage {
  type: MessageType;
  role: string;
  content: string;
  tool_calls?: Array<ToolCall>;
  id: string;
  tool_call_id?: string;
  should_respond_tool_call?: boolean;
}

export interface ToolCall {
  function: {
    name: string;
    arguments: string;
  };
  tool_call_id: string;
  id: string;
}

export interface ToolResponse {
  type: 'message';
  role: 'tool';
  content: string;
  tool_call_id: string;
  id: string;
}

interface ToolResponseMessage {
  type: string;
  role: string;
  content: string;
  tool_responses: Array<ToolResponse>;
}

interface ChatContextType {
  chatMessages: ChatMessage[];
  handleSendMessage: (content: string, type: MessageType, role: string, tool_call_id?: string) => void;
  state: string;
  toolsInProcess: boolean;
  messagesInProcess: boolean;
  readyState: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
  chatState: ChatState;
}

export const ChatProvider: React.FC<ChatProviderProps> = (props) => {
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const { sendMessage, lastMessage, readyState } = useChatWebSocket(wsUrl || '');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messageIndexMap = useRef<Map<string, number>>(new Map());
  const confirmationTimeout = useRef<NodeJS.Timeout | null>(null);

  const [messagesInProcess, setMessagesInProcess] = useState(false);
  const [toolsInProcess, setToolsInProcess] = useState(false);
  const [state, setState] = useState('');
  const { uid } = useAuth();

  useEffect(() => {
    if (uid) {
      setWsUrl(`${SOCKET_URL}/${uid}/${props.chatState}`);

      Sentry.addBreadcrumb({
        category: "chat",
        message: `Chat session started for user ${uid} and chat state ${props.chatState}`,
        level: "info",
        data: { chatState: props.chatState },
      });
    }
    return () => {
      if (uid) {
        Sentry.addBreadcrumb({
          category: "chat",
          message: "Chat session ended",
          level: "info",
        });
      }
    };
  }, [uid]);

  useEffect(() => {
    if (lastMessage !== null && typeof lastMessage.data === 'string') {
      try {
        const messageData = JSON.parse(lastMessage.data) as ChatMessage;
        void handleIncomingMessage(messageData);
      } catch (error) {
        captureError(error, 'Failed to parse incoming message');
      }
    }
  }, [lastMessage]);

  const shouldDisplayMessage = (messageData: ChatMessage) => {
    if (
      (messageData.content || messageData.type === 'acknowledgement') &&
      !(messageData.type === 'progress' || messageData.role === 'tool')
    ) {
      return true;
    }
    return false;
  };

  const handleIncomingMessage = async (messageData: ChatMessage) => {
    try {
      const { id: messageId, type: messageType, content: messageContent } = messageData;

      if (messageType !== 'acknowledgement' && (shouldDisplayMessage(messageData)) || messageType === 'closing') {
        removeAcknowledgement();
      }

      switch (messageType) {
        case 'acknowledgement':
          handleAcknowledgement(messageData);
          break;

        case 'stream':
          updateStreamMessage(messageData);
          break;

        case 'closing':
          finalizeStream(messageData);
          setMessagesInProcess(false);
          clearConfirmationTimeout();
          break;

        case 'progress':
          setState(messageContent);
          break;

        case 'tool':
          if (messageData.content) {
            const newMessage: ChatMessage = {
              ...messageData,
              type: 'message',
              role: 'assistant',
            }

            addOrUpdateMessage(newMessage);
            handleAcknowledgement({ type: 'acknowledgement', content: '', role: 'assistant', id: uuidv4() })
          }
          if (messageData.tool_calls) {
            setToolsInProcess(true);
            await handleIncomingToolCall(messageData);
            setToolsInProcess(false);
          }
          break;

        default:
          if (messageId && shouldDisplayMessage(messageData)) {
            addOrUpdateMessage(messageData);
          }
          break;
      }
    } catch (error) {
      captureError(error, 'Error processing incoming message');
    }
  };

  const handleAcknowledgement = (message: ChatMessage) => {
    if (!messagesInProcess) {
      setMessagesInProcess(true);
      resetConfirmationTimeout();
    }

    if (message.content === 'start_conversation') {
      return;
    } else {
      removeAcknowledgement();
      if (shouldDisplayMessage(message)) {
        addOrUpdateMessage(message);
      }
    }
  };

  const handleIncomingToolCall = async (messageData: ChatMessage) => {
    const should_respond = messageData.should_respond_tool_call ?? true;

    const toolResponse: ToolResponseMessage = {
      type: 'message',
      role: 'tool_responses',
      content: '',
      tool_responses: [],
    };

    if (!messageData.tool_calls) return;
    for (const tool_call of messageData.tool_calls) {
      try {
        const newMessage = await handleToolCall(tool_call, should_respond, addOrUpdateMessage, messageData.id);
        if (newMessage) {
          toolResponse.tool_responses?.push(newMessage);
        }
      } catch (error) {
        captureError(error, `Error processing tool call: ${tool_call.id}`);
      }
    }
    if (should_respond) {
      sendMessage(JSON.stringify(toolResponse));
    }
  };

  const updateStreamMessage = (messageData: ChatMessage) => {
    setChatMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      const idx = messageIndexMap.current.get(messageData.id);

      if (idx !== undefined) {
        const existing = newMessages[idx];
        newMessages[idx] = {
          ...existing,
          content: existing.content + messageData.content,
        };
      } else {
        const newMsg: ChatMessage = {
          ...messageData,
        };
        newMessages.push(newMsg);
        messageIndexMap.current.set(messageData.id, newMessages.length - 1);
      }
      return newMessages;
    });
  };

  const finalizeStream = (messageData: ChatMessage) => {
    setChatMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      const idx = messageIndexMap.current.get(messageData.id);
      if (idx !== undefined) {
        const existing = newMessages[idx];
        if (existing.type === 'stream') {
          newMessages[idx] = {
            ...existing,
            type: 'message', // final type
          };
        }
      }
      return newMessages;
    });
  };

  const addOrUpdateMessage = (messageData: ChatMessage) => {
    removeAcknowledgement();
    setChatMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      const idx = messageIndexMap.current.get(messageData.id);

      if (idx !== undefined) {
        const existing = newMessages[idx];
        if (existing.content === messageData.content && existing.type === messageData.type) {
          return prevMessages;
        }
        newMessages[idx] = { ...existing, ...messageData };
      } else {
        newMessages.push(messageData);
        messageIndexMap.current.set(messageData.id, newMessages.length - 1);
      }
      return newMessages;
    });
  };

  const removeAcknowledgement = () => {
    setChatMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      if (newMessages.length === 0) return newMessages;

      const last = newMessages[newMessages.length - 1];
      if (last.type === 'acknowledgement') {
        messageIndexMap.current.delete(last.id);
        return newMessages.slice(0, -1);
      }
      return newMessages;
    });
  };

  const resetConfirmationTimeout = () => {
    if (confirmationTimeout.current) {
      clearTimeout(confirmationTimeout.current);
    }
    confirmationTimeout.current = setTimeout(() => {
      setMessagesInProcess(false);
    }, 20000);
  };

  const clearConfirmationTimeout = () => {
    if (confirmationTimeout.current) {
      clearTimeout(confirmationTimeout.current);
      confirmationTimeout.current = null;
    }
  };

  const handleSendMessage = (
    messageContent: string,
    type: MessageType,
    role: string,
    tool_call_id: string = ''
  ) => {
    const messageId = uuidv4();
    const message: ChatMessage = {
      type,
      role,
      content: messageContent,
      tool_call_id,
      id: messageId,
    };

    if (role === 'user') {
      setChatMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        newMessages.push(message);
        messageIndexMap.current.set(messageId, newMessages.length - 1);
        return newMessages;
      });
    }

    sendMessage(JSON.stringify(message));
  };

  return (
    <ChatContext.Provider
      value={{
        chatMessages,
        handleSendMessage,
        state,
        toolsInProcess,
        messagesInProcess,
        readyState,
      }}
    >
      {props.children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};
