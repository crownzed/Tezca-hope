import { listCommunityRoomMessages, insertCommunityRoomMessage } from '../db.js';
import { broadcastCommunityEvent, roomChannel } from '../communityDelivery.js';

export async function listRoomMessages(topic, opts) {
  return listCommunityRoomMessages(topic, opts);
}

export async function sendRoomMessage(input) {
  const message = await insertCommunityRoomMessage(input);
  if (message) {
    broadcastCommunityEvent(roomChannel(input.topic), {
      type: 'community_room_message',
      message,
    });
  }
  return message;
}
