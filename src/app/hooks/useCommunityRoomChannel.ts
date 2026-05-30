import { useCallback, useEffect, useRef, useState } from 'react';
import { canUseWebSocket, wsUrl } from '../lib/api';
import type { CommunityRoomTopic } from '../lib/communityTopics';
import type { CommunityRoomMessageEvent } from './useCommunityRealtime';

export type RoomPresenceMember = {
  userId: string;
  userName: string;
  role: string;
};

type RoomHandlers = {
  onMessage?: (message: CommunityRoomMessageEvent) => void;
};

const TYPING_TTL_MS = 3500;

export function useCommunityRoomChannel(
  token: string | null,
  topic: CommunityRoomTopic,
  enabled: boolean,
  handlers: RoomHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [onlineMembers, setOnlineMembers] = useState<RoomPresenceMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const typingExpiryRef = useRef<Record<string, number>>({});
  const lastTypingSentRef = useRef(0);

  const channel = `room:${topic}`;

  const sendTyping = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1800) return;
    lastTypingSentRef.current = now;
    ws.send(JSON.stringify({ type: 'community_typing' }));
  }, []);

  useEffect(() => {
    if (!enabled || !token || !canUseWebSocket()) {
      setOnlineMembers([]);
      setTypingUsers({});
      return;
    }

    const ws = new WebSocket(wsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'community_join', channel }));
    };

    ws.onmessage = (ev) => {
      let data: {
        type?: string;
        message?: CommunityRoomMessageEvent;
        members?: RoomPresenceMember[];
        userId?: string;
        userName?: string;
      };
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }

      if (data.type === 'community_room_message' && data.message) {
        handlersRef.current.onMessage?.(data.message);
      }

      if (data.type === 'community_presence' && Array.isArray(data.members)) {
        setOnlineMembers(data.members);
      }

      if (data.type === 'community_typing' && data.userId && data.userName) {
        setTypingUsers((prev) => ({ ...prev, [data.userId!]: data.userName! }));
        const existing = typingExpiryRef.current[data.userId];
        if (existing) window.clearTimeout(existing);
        typingExpiryRef.current[data.userId] = window.setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[data.userId!];
            return next;
          });
          delete typingExpiryRef.current[data.userId!];
        }, TYPING_TTL_MS);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setOnlineMembers([]);
      setTypingUsers({});
      for (const id of Object.values(typingExpiryRef.current)) {
        window.clearTimeout(id);
      }
      typingExpiryRef.current = {};
    };
  }, [enabled, token, channel]);

  const typingLabel = Object.values(typingUsers).filter(Boolean);
  const typingText =
    typingLabel.length === 0
      ? ''
      : typingLabel.length === 1
        ? `${typingLabel[0]} đang nhập…`
        : `${typingLabel.slice(0, 2).join(', ')}${typingLabel.length > 2 ? ` và ${typingLabel.length - 2} người` : ''} đang nhập…`;

  return { onlineMembers, typingText, sendTyping };
}
