import { useEffect, useRef } from 'react';
import { canUseWebSocket, wsUrl } from '../lib/api';
import type { CommunityRoomTopic } from '../lib/communityTopics';

export type CommunityPostEvent = {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  topic: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  commentCount: number;
  createdAt: number;
};

export type CommunityRoomMessageEvent = {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: number;
};

type ForumHandlers = {
  onPost?: (post: CommunityPostEvent) => void;
  onPostRemoved?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onCommentRemoved?: (postId: string, commentId: string) => void;
};

type RoomHandlers = {
  onMessage?: (message: CommunityRoomMessageEvent) => void;
};

export function useCommunityForumRealtime(
  token: string | null,
  enabled: boolean,
  handlers: ForumHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !token || !canUseWebSocket()) return;

    const ws = new WebSocket(wsUrl(token));
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'community_join', channel: 'forum' }));
    };
    ws.onmessage = (ev) => {
      let data: { type?: string; post?: CommunityPostEvent; postId?: string; commentId?: string };
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (data.type === 'community_post' && data.post) {
        handlersRef.current.onPost?.(data.post);
      }
      if (data.type === 'community_post_removed' && data.postId) {
        handlersRef.current.onPostRemoved?.(data.postId);
      }
      if (data.type === 'community_comment' && data.postId) {
        handlersRef.current.onComment?.(data.postId);
      }
      if (data.type === 'community_comment_removed' && data.postId) {
        handlersRef.current.onCommentRemoved?.(data.postId, data.commentId || '');
      }
    };
    return () => ws.close();
  }, [enabled, token]);
}

export function useCommunityRoomRealtime(
  token: string | null,
  topic: CommunityRoomTopic,
  enabled: boolean,
  handlers: RoomHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const channel = `room:${topic}`;

  useEffect(() => {
    if (!enabled || !token || !canUseWebSocket()) return;

    const ws = new WebSocket(wsUrl(token));
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'community_join', channel }));
    };
    ws.onmessage = (ev) => {
      let data: { type?: string; message?: CommunityRoomMessageEvent };
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (data.type === 'community_room_message' && data.message) {
        handlersRef.current.onMessage?.(data.message);
      }
    };
    return () => ws.close();
  }, [enabled, token, channel]);
}

export function useCommunityRoomPoll(
  loadRoom: () => void,
  enabled: boolean,
  intervalMs = 5000,
) {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(loadRoom, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, loadRoom, intervalMs]);
}

export function mergeUniqueById<T extends { id: string }>(prev: T[], incoming: T[]): T[] {
  if (!incoming.length) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => {
    const ta = 'createdAt' in a ? (a as { createdAt: number }).createdAt : 0;
    const tb = 'createdAt' in b ? (b as { createdAt: number }).createdAt : 0;
    return ta - tb;
  });
}
