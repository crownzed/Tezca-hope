import { insertLiveMessage } from './db.js';
import { maybeSync } from './db/connection.js';
import { moderateText } from './contentModeration.js';

/** @type {((customerId: string, payload: object, exceptWs?: import('ws').WebSocket) => void) | null} */
let roomBroadcast = null;

export function registerLiveRoomBroadcast(fn) {
  roomBroadcast = fn;
}

/**
 * Gửi tin nhắn chat trực tiếp (chuyên gia↔khách).
 * @param {{ customerId: string, senderUserId: string, senderRole: string,
 *   content?: string, imageUrl?: string }} arg
 * @returns {object|null} message đã lưu, hoặc { error, code } nếu vi phạm / rỗng
 */
export function sendLiveChatMessage({ customerId, senderUserId, senderRole, content, imageUrl }, exceptWs) {
  const text = String(content || '').trim().slice(0, 4000);
  const img = String(imageUrl || '').trim();
  // Cho phép gửi khi có ảnh dù text rỗng; chặn nếu cả hai đều rỗng.
  if (!text && !img) return { error: 'Tin nhắn trống', code: 'EMPTY' };

  // Kiểm duyệt nội dung văn bản (ảnh không lọc ở tầng này).
  if (text) {
    const mod = moderateText(text);
    if (mod.action === 'block') {
      return { error: 'Nội dung vi phạm nguyên tắc cộng đồng nên không thể gửi.', code: 'CONTENT_VIOLATION', categories: mod.categories };
    }
  }

  const msg = insertLiveMessage({
    customerId,
    senderUserId,
    senderRole,
    content: text,
    imageUrl: img,
  });
  // Trên host có WebSocket + Turso, WS không đi qua middleware HTTP nên phải
  // chủ động đẩy write lên Turso primary để instance khác thấy (no-op khi SQLite local).
  try {
    maybeSync({ force: true });
  } catch {
    /* lỗi sync không làm hỏng gửi tin */
  }
  const out = { type: 'live_message', message: msg };
  if (roomBroadcast) roomBroadcast(customerId, out, exceptWs);
  return msg;
}
