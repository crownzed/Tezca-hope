import { listCommunityRoomMessages, insertCommunityRoomMessage } from '../db.js';
import { broadcastCommunityEvent, roomChannel } from '../communityDelivery.js';

export function listRoomMessages(topic, opts) {
  return listCommunityRoomMessages(topic, opts);
}

export function sendRoomMessage(input) {
  const message = insertCommunityRoomMessage(input);
  if (message) {
    broadcastCommunityEvent(roomChannel(input.topic), {
      type: 'community_room_message',
      message,
    });
  }
  return message;
}
