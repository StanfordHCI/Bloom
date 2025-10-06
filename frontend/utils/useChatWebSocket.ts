import { useEffect, useRef, useState } from 'react';
import { useAuth } from "../context/AuthContext";

interface WebSocketHook {
  sendMessage: (message: string) => void;
  lastMessage: WebSocketMessageEvent | null;
  readyState: number;
}

const useChatWebSocket = (url: string): WebSocketHook => {
  const { authToken, isInitializing } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<WebSocketMessageEvent | null>(null);
  const [, setReconnectAttempts] = useState<number>(0);

  const connect = () => {
    if (isInitializing) return;
    console.log("connecting to websocket");
    if (!url || url.trim() === '') {
      console.log('Cannot connect WebSocket: URL is empty');
      return;
    }

    // Prevent multiple connections
    if (
      ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)
    ) {
      console.log('WebSocket is already open or connecting. No need to reconnect.');
      return;
    }

    ws.current = new WebSocket(url, `Bearer ${authToken}`);

    ws.current.onopen = () => {
      setReadyState(WebSocket.OPEN);
      setReconnectAttempts(0);
      console.log('WebSocket connected');

      // Clear any pending reconnection attempts
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    ws.current.onmessage = (e: WebSocketMessageEvent) => {
      setLastMessage(e);
    };

    ws.current.onclose = (e: WebSocketCloseEvent) => {
      setReadyState(WebSocket.CLOSED);
      console.log(`WebSocket closed: ${e.code} ${e.reason}`);

      // Clear any existing timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      // Reconnect with exponential backoff
      const maxDelay = 30000; 
      const baseDelay = 1000;
      const jitterMax = 500;

      setReconnectAttempts((prev) => {
        const delay = Math.min(baseDelay * 2 ** prev, maxDelay);
        const jitter = Math.random() * jitterMax;
    
        console.log(`Reconnection attempt ${prev + 1} in ${delay + jitter / 1000}s`);
    
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, delay + jitter);
    
        return prev + 1; 
      });
    };

    ws.current.onerror = (e: Event) => {
      console.error('WebSocket error:', e);
    };
  };

  useEffect(() => {
    if (isInitializing) return;
    if (!url || url.trim() === '') {
      console.log('Cannot connect WebSocket: URL is empty');
      return;
    }
    
    connect();
    return () => {
      ws.current?.close();

      // Clear any pending reconnection attempts
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [url, authToken]);

  const sendMessage = (message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.warn('Cannot send message, WebSocket is not open');
    }
  };

  return { sendMessage, lastMessage, readyState };
};

export default useChatWebSocket;
