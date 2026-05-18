import { verifyToken } from './auth.js';
import { canExpertAccessPatient, insertLiveMessage } from './db.js';

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map();

function joinRoom(patientId, ws) {
  if (!rooms.has(patientId)) rooms.set(patientId, new Set());
  rooms.get(patientId).add(ws);
  ws.__patientId = patientId;
}

function leaveRoom(ws) {
  const pid = ws.__patientId;
  if (pid && rooms.has(pid)) {
    rooms.get(pid).delete(ws);
    if (rooms.get(pid).size === 0) rooms.delete(pid);
  }
  ws.__patientId = undefined;
}

function broadcast(patientId, payload, exceptWs) {
  const set = rooms.get(patientId);
  if (!set) return;
  const raw = JSON.stringify(payload);
  for (const client of set) {
    if (client !== exceptWs && client.readyState === 1) client.send(raw);
  }
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

      if (data.type === 'join') {
        leaveRoom(ws);
        const { patientId } = data;
        if (!patientId) return;
        if (role === 'user' && patientId !== userId) return;
        if (role === 'expert' && !canExpertAccessPatient(userId, patientId)) return;
        joinRoom(patientId, ws);
        ws.send(JSON.stringify({ type: 'joined', patientId }));
        return;
      }

      if (data.type === 'message') {
        const { patientId, text } = data;
        if (!patientId || !text || typeof text !== 'string') return;
        if (!ws.__patientId || ws.__patientId !== patientId) return;
        if (role === 'user' && patientId !== userId) return;
        if (role === 'expert' && !canExpertAccessPatient(userId, patientId)) return;

        const senderRole = role === 'expert' ? 'expert' : 'patient';
        const msg = insertLiveMessage({
          patientId,
          senderUserId: userId,
          senderRole,
          content: text.trim().slice(0, 4000),
        });
        const out = { type: 'live_message', message: msg };
        ws.send(JSON.stringify(out));
        broadcast(patientId, out, ws);
        return;
      }
    });

    ws.on('close', () => leaveRoom(ws));
  });
}
