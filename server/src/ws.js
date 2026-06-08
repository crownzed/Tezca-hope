import { verifyToken } from './auth.js';
import { canExpertAccessCustomer, findUserById } from './db.js';
import { addCommunityPresence, removeCommunityPresence } from './communityPresence.js';
import { registerLiveRoomBroadcast, sendLiveChatMessage } from './liveChatDelivery.js';
import {
  registerCommunityChannelBroadcast,
  setCommunityDefaultBroadcaster,
  forumChannel,
  roomChannel,
  announcementsChannel,
} from './communityDelivery.js';
import { getCommunityDmThreadForUser } from './db.js';
import { isValidRoomTopic } from './communityTopics.js';

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const liveRooms = new Map();

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const communityChannels = new Map();

function joinMap(map, key, ws) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(ws);
}

function leaveMap(map, ws, keyField) {
  const key = ws[keyField];
  if (key && map.has(key)) {
    map.get(key).delete(ws);
    if (map.get(key).size === 0) map.delete(key);
  }
  ws[keyField] = undefined;
}

function broadcastMap(map, key, payload, exceptWs) {
  const set = map.get(key);
  if (!set) return;
  const raw = JSON.stringify(payload);
  for (const client of set) {
    if (client !== exceptWs && client.readyState === 1) client.send(raw);
  }
}

function joinLiveRoom(customerId, ws) {
  leaveLiveRoom(ws);
  joinMap(liveRooms, customerId, ws);
  ws.__customerId = customerId;
}

function leaveLiveRoom(ws) {
  leaveMap(liveRooms, ws, '__customerId');
}

function broadcastLive(customerId, payload, exceptWs) {
  broadcastMap(liveRooms, customerId, payload, exceptWs);
}

function joinCommunityChannel(channel, ws) {
  leaveCommunityChannel(ws);
  joinMap(communityChannels, channel, ws);
  ws.__communityChannel = channel;
}

function leaveCommunityChannel(ws) {
  const channel = ws.__communityChannel;
  const user = ws.__communityUser;
  if (channel && user?.userId) {
    const members = removeCommunityPresence(channel, user.userId);
    if (channel.startsWith('room:')) {
      broadcastCommunity(channel, { type: 'community_presence', members });
    }
  }
  ws.__communityUser = undefined;
  leaveMap(communityChannels, ws, '__communityChannel');
}

function setCommunityWsUser(ws, userId, role) {
  const dbUser = findUserById(userId);
  ws.__communityUser = {
    userId,
    userName: dbUser?.name || 'Thành viên',
    role: role || dbUser?.role || 'user',
  };
}

function announceRoomPresence(channel, ws) {
  const user = ws.__communityUser;
  if (!user || !channel.startsWith('room:')) return;
  const members = addCommunityPresence(channel, user);
  broadcastCommunity(channel, { type: 'community_presence', members });
  ws.send(JSON.stringify({ type: 'community_presence', members }));
}

function broadcastCommunity(channel, payload, exceptWs) {
  broadcastMap(communityChannels, channel, payload, exceptWs);
}

registerLiveRoomBroadcast(broadcastLive);
registerCommunityChannelBroadcast(forumChannel(), (payload, exceptWs) =>
  broadcastCommunity(forumChannel(), payload, exceptWs),
);

for (const topic of ['nutrition', 'psychology', 'musculoskeletal']) {
  registerCommunityChannelBroadcast(roomChannel(topic), (payload, exceptWs) =>
    broadcastCommunity(roomChannel(topic), payload, exceptWs),
  );
}

registerCommunityChannelBroadcast(announcementsChannel(), (payload, exceptWs) =>
  broadcastCommunity(announcementsChannel(), payload, exceptWs),
);

setCommunityDefaultBroadcaster(broadcastCommunity);

function roomIdFromPayload(data) {
  return data.customerId ?? data.patientId;
}

export function attachWebSocketServer(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const token = url.searchParams.get('token');
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      ws.close(4001, 'auth');
      return;
    }
    ws.__auth = payload;

    ws.on('message', (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const userId = payload.sub;
      const role = payload.role;

      if (data.type === 'community_join') {
        leaveLiveRoom(ws);
        leaveCommunityChannel(ws);
        const channel = String(data.channel || '');
        if (channel === 'forum') {
          setCommunityWsUser(ws, userId, role);
          joinCommunityChannel(forumChannel(), ws);
          ws.send(JSON.stringify({ type: 'community_joined', channel: 'forum' }));
          return;
        }
        if (channel.startsWith('room:')) {
          const topic = channel.slice(5);
          if (!isValidRoomTopic(topic)) return;
          setCommunityWsUser(ws, userId, role);
          const roomKey = roomChannel(topic);
          joinCommunityChannel(roomKey, ws);
          announceRoomPresence(roomKey, ws);
          ws.send(JSON.stringify({ type: 'community_joined', channel: `room:${topic}` }));
          return;
        }
        if (channel === announcementsChannel()) {
          setCommunityWsUser(ws, userId, role);
          joinCommunityChannel(announcementsChannel(), ws);
          ws.send(JSON.stringify({ type: 'community_joined', channel: announcementsChannel() }));
          return;
        }
        if (channel.startsWith('dm:')) {
          const threadId = channel.slice(3);
          const thread = getCommunityDmThreadForUser(threadId, userId);
          if (!thread) return;
          setCommunityWsUser(ws, userId, role);
          joinCommunityChannel(channel, ws);
          ws.send(JSON.stringify({ type: 'community_joined', channel }));
          return;
        }
        return;
      }

      if (data.type === 'community_typing') {
        const channel = ws.__communityChannel;
        const user = ws.__communityUser;
        if (!channel || !user) return;
        if (!channel.startsWith('room:') && !channel.startsWith('dm:')) return;
        broadcastCommunity(channel, {
          type: 'community_typing',
          userId: user.userId,
          userName: user.userName,
        }, ws);
        return;
      }

      if (data.type === 'join') {
        leaveCommunityChannel(ws);
        leaveLiveRoom(ws);
        const customerId = roomIdFromPayload(data);
        if (!customerId) return;
        if (role === 'user' && customerId !== userId) return;
        if (role === 'expert' && !canExpertAccessCustomer(userId, customerId)) return;
        joinLiveRoom(customerId, ws);
        ws.send(JSON.stringify({ type: 'joined', customerId }));
        return;
      }

      if (data.type === 'message') {
        const customerId = roomIdFromPayload(data);
        const { text } = data;
        if (!customerId || !text || typeof text !== 'string') return;
        if (!ws.__customerId || ws.__customerId !== customerId) return;
        if (role === 'user' && customerId !== userId) return;
        if (role === 'expert' && !canExpertAccessCustomer(userId, customerId)) return;

        const senderRole = role === 'expert' ? 'expert' : 'customer';
        const msg = sendLiveChatMessage(
          {
            customerId,
            senderUserId: userId,
            senderRole,
            content: text,
          },
          ws,
        );
        if (msg) {
          ws.send(JSON.stringify({ type: 'live_message', message: msg }));
        }
      }
    });

    ws.on('close', () => {
      leaveLiveRoom(ws);
      leaveCommunityChannel(ws);
    });
  });
}
