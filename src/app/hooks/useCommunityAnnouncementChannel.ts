import { useEffect, useRef } from 'react';
import { canUseWebSocket, wsUrl } from '../lib/api';

export type AnnouncementMessage = {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: number;
};

type Handlers = {
  onMessage?: (message: AnnouncementMessage) => void;
};

export function useCommunityAnnouncementChannel(
  token: string | null,
  enabled: boolean,
  handlers: Handlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !token || !canUseWebSocket()) return;

    const ws = new WebSocket(wsUrl(token));
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'community_join', channel: 'announcements' }));
    };
    ws.onmessage = (ev) => {
      let data: { type?: string; message?: AnnouncementMessage };
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (data.type === 'community_announcement_message' && data.message) {
        handlersRef.current.onMessage?.(data.message);
      }
    };
    return () => ws.close();
  }, [enabled, token]);
}
