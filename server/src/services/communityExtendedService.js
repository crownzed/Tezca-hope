import {
  listCommunityAnnouncementMessages,
  insertCommunityAnnouncementMessage,
  getOrCreateCommunityDmThread,
  listCommunityDmThreads,
  getCommunityDmThreadForUser,
  listCommunityDmMessages,
  insertCommunityDmMessage,
  searchCommunityMembers,
  listRoomMentionCandidates,
} from '../db.js';
import {
  broadcastCommunityEvent,
  announcementsChannel,
  dmChannel,
} from '../communityDelivery.js';

export function canPostAnnouncement(role) {
  return role === 'expert' || role === 'admin';
}

export async function listAnnouncements(opts) {
  return listCommunityAnnouncementMessages(opts);
}

export async function postAnnouncement(input) {
  const message = await insertCommunityAnnouncementMessage(input);
  if (message) {
    broadcastCommunityEvent(announcementsChannel(), {
      type: 'community_announcement_message',
      message,
    });
  }
  return message;
}

export async function listDmThreads(userId) {
  return listCommunityDmThreads(userId);
}

export async function openDmThread(userId, otherUserId) {
  return getOrCreateCommunityDmThread(userId, otherUserId);
}

export async function getDmThread(threadId, userId) {
  return getCommunityDmThreadForUser(threadId, userId);
}

export async function listDmMessages(threadId, userId, opts) {
  return listCommunityDmMessages(threadId, userId, opts);
}

export async function sendDmMessage(input) {
  const message = await insertCommunityDmMessage(input);
  if (message) {
    broadcastCommunityEvent(dmChannel(input.threadId), {
      type: 'community_dm_message',
      message,
    });
  }
  return message;
}

export async function searchMembers(opts) {
  return searchCommunityMembers(opts);
}

export async function mentionCandidates(topic, opts) {
  return listRoomMentionCandidates(topic, opts);
}
