import { useEffect, useRef, useCallback, useState } from 'react';

export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  [key: string]: any;
}

interface WebSocketState {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  reconnectAttempts: number;
}

export const useWebSocket = (url?: string) => {
  const ws = useRef<WebSocket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    reconnectAttempts: 0,
  });

  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 3000;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Use provided URL or fallback to environment variable or disable WebSocket
    const wsUrl = url || (process.env.NEXT_PUBLIC_WS_URL as string);
    
    // Log the configuration for debugging
    console.log(`[WebSocket] Configured URL: "${wsUrl}"`);
    console.log(`[WebSocket] URL is empty: ${!wsUrl || wsUrl.trim() === ''}`);
    
    // If no WebSocket URL is configured, don't try to connect
    if (!wsUrl || wsUrl.trim() === '') {
      console.warn('⚠️ WebSocket URL not configured, skipping connection');
      setState(prev => ({
        ...prev,
        isConnected: false,
      }));
      return;
    }

    try {
      console.log('🔗 Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          reconnectAttempts: 0,
        }));
      };

      ws.current.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message.type);
          setState(prev => ({
            ...prev,
            lastMessage: message,
          }));
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onerror = (event: Event) => {
        console.error('❌ WebSocket error:', event);
        setState(prev => ({
          ...prev,
          isConnected: false,
        }));
      };

      ws.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setState(prev => ({
          ...prev,
          isConnected: false,
        }));

        // Attempt to reconnect
        setState(prev => {
          if (prev.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const newAttempts = prev.reconnectAttempts + 1;
            console.log(
              `⏳ Reconnecting in ${RECONNECT_DELAY}ms (attempt ${newAttempts}/${MAX_RECONNECT_ATTEMPTS})`
            );

            setTimeout(connect, RECONNECT_DELAY);
            return { ...prev, reconnectAttempts: newAttempts };
          }

          console.error('❌ Max reconnection attempts reached');
          return prev;
        });
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
      }));
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      console.log('📤 WebSocket sent:', message.type);
    } else {
      console.warn('⚠️ WebSocket is not connected');
    }
  }, []);

  const subscribe = useCallback(
    (channel: string) => {
      send({ type: 'subscribe', channel });
    },
    [send]
  );

  const unsubscribe = useCallback(
    (channel: string) => {
      send({ type: 'unsubscribe', channel });
    },
    [send]
  );

  return {
    ...state,
    send,
    subscribe,
    unsubscribe,
    reconnect: connect,
  };
};
