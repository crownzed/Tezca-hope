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
  markCommunityDmThreadRead,
  countUnreadCommunityDm,
} from '../db.js';
import {
  broadcastCommunityEvent,
  announcementsChannel,
  dmChannel,
} from '../communityDelivery.js';

export function canPostAnnouncement(role) {
  return role === 'expert' || role === 'admin';
}

export function listAnnouncements(opts) {
  return listCommunityAnnouncementMessages(opts);
}

export function postAnnouncement(input) {
  const message = insertCommunityAnnouncementMessage(input);
  if (message) {
    broadcastCommunityEvent(announcementsChannel(), {
      type: 'community_announcement_message',
      message,
    });
  }
  return message;
}

export function listDmThreads(userId) {
  return listCommunityDmThreads(userId);
}

export function openDmThread(userId, otherUserId) {
  return getOrCreateCommunityDmThread(userId, otherUserId);
}

export function getDmThread(threadId, userId) {
  return getCommunityDmThreadForUser(threadId, userId);
}

export function listDmMessages(threadId, userId, opts) {
  return listCommunityDmMessages(threadId, userId, opts);
}

export function sendDmMessage(input) {
  const message = insertCommunityDmMessage(input);
  if (message) {
    broadcastCommunityEvent(dmChannel(input.threadId), {
      type: 'community_dm_message',
      message,
    });
  }
  return message;
}

export function searchMembers(opts) {
  return searchCommunityMembers(opts);
}

export function markDmThreadRead(threadId, userId) {
  const result = markCommunityDmThreadRead(threadId, userId);
  if (result) {
    // Báo cho đối phương biết tin đã được đọc (read receipt)
    broadcastCommunityEvent(dmChannel(threadId), {
      type: 'community_dm_read',
      threadId,
      readerId: userId,
      readAt: result.readAt,
    });
  }
  return result;
}

export function countUnreadDm(userId) {
  return countUnreadCommunityDm(userId);
}

export function mentionCandidates(topic, opts) {
  return listRoomMentionCandidates(topic, opts);
}
