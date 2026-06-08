import { useCallback, useEffect, useRef, useState } from 'react';
import { canUseWebSocket, wsUrl } from '../lib/api';

export type DmMessage = {
  id: string;
  threadId: string;
  senderId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: number;
};

type Handlers = {
  onMessage?: (message: DmMessage) => void;
};

const TYPING_TTL_MS = 3500;

export function useCommunityDmChannel(
  token: string | null,
  threadId: string | null,
  enabled: boolean,
  handlers: Handlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [typingText, setTypingText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const typingExpiryRef = useRef<Record<string, number>>({});
  const lastTypingSentRef = useRef(0);

  const sendTyping = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1800) return;
    lastTypingSentRef.current = now;
    ws.send(JSON.stringify({ type: 'community_typing' }));
  }, []);

  useEffect(() => {
    if (!enabled || !token || !threadId || !canUseWebSocket()) {
      setTypingText('');
      return;
    }

    const channel = `dm:${threadId}`;
    const ws = new WebSocket(wsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'community_join', channel }));
    };

    ws.onmessage = (ev) => {
      let data: {
        type?: string;
        message?: DmMessage;
        userId?: string;
        userName?: string;
      };
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (data.type === 'community_dm_message' && data.message) {
        handlersRef.current.onMessage?.(data.message);
      }
      if (data.type === 'community_typing' && data.userId && data.userName) {
        setTypingText(`${data.userName} đang nhập…`);
        const existing = typingExpiryRef.current[data.userId];
        if (existing) window.clearTimeout(existing);
        typingExpiryRef.current[data.userId] = window.setTimeout(() => {
          setTypingText('');
          delete typingExpiryRef.current[data.userId];
        }, TYPING_TTL_MS);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setTypingText('');
      for (const id of Object.values(typingExpiryRef.current)) {
        window.clearTimeout(id);
      }
      typingExpiryRef.current = {};
    };
  }, [enabled, token, threadId]);

  return { typingText, sendTyping };
}
