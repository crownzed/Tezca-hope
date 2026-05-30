/** @typedef {'forum' | `room:${string}`} CommunityChannel */

/** @type {Map<string, (payload: object, exceptWs?: import('ws').WebSocket) => void>} */
const channelBroadcasters = new Map();

/** @type {((channel: string, payload: object, exceptWs?: import('ws').WebSocket) => void) | null} */
let defaultBroadcaster = null;

export function registerCommunityChannelBroadcast(channel, fn) {
  channelBroadcasters.set(channel, fn);
}

export function setCommunityDefaultBroadcaster(fn) {
  defaultBroadcaster = fn;
}

export function broadcastCommunityEvent(channel, payload, exceptWs) {
  const fn = channelBroadcasters.get(channel);
  if (fn) {
    fn(payload, exceptWs);
    return;
  }
  if (defaultBroadcaster) defaultBroadcaster(channel, payload, exceptWs);
}

export function forumChannel() {
  return 'forum';
}

export function roomChannel(topic) {
  return `room:${topic}`;
}

export function announcementsChannel() {
  return 'announcements';
}

export function dmChannel(threadId) {
  return `dm:${threadId}`;
}
