import { insertLiveMessage } from './db.js';

/** @type {((customerId: string, payload: object, exceptWs?: import('ws').WebSocket) => void) | null} */
let roomBroadcast = null;

export function registerLiveRoomBroadcast(fn) {
  roomBroadcast = fn;
}

export function sendLiveChatMessage({ customerId, senderUserId, senderRole, content }, exceptWs) {
  const text = String(content || '').trim().slice(0, 4000);
  if (!text) return null;
  const msg = insertLiveMessage({
    customerId,
    senderUserId,
    senderRole,
    content: text,
  });
  const out = { type: 'live_message', message: msg };
  if (roomBroadcast) roomBroadcast(customerId, out, exceptWs);
  return msg;
}
