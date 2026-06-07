/**
 * Lưu trữ cộng đồng: Firestore khi đã cấu hình Firebase, ngược lại SQLite.
 * Tài khoản (`users`) vẫn trên SQLite.
 */
import { isFirestoreConfigured } from './firestore.js';
import * as sqlite from './repositories/communityRepository.js';
import * as sqliteExt from './repositories/communityExtendedRepository.js';
import * as firestore from './repositories/communityFirestoreRepository.js';

export function useCommunityFirestore() {
  if (!isFirestoreConfigured()) return false;
  return String(process.env.TEZCA_COMMUNITY_FIRESTORE ?? '1').trim() !== '0';
}

const pick = (fsFn, sqlFn) =>
  async (...args) => (useCommunityFirestore() ? fsFn(...args) : sqlFn(...args));

export const listCommunityPosts = pick(firestore.listCommunityPosts, sqlite.listCommunityPosts);
export const getCommunityPostById = pick(firestore.getCommunityPostById, sqlite.getCommunityPostById);
export const createCommunityPost = pick(firestore.createCommunityPost, sqlite.createCommunityPost);
export const deleteCommunityPost = pick(firestore.deleteCommunityPost, sqlite.deleteCommunityPost);
export const setCommunityPostStatus = pick(firestore.setCommunityPostStatus, sqlite.setCommunityPostStatus);
export const listCommunityComments = pick(firestore.listCommunityComments, sqlite.listCommunityComments);
export const createCommunityComment = pick(firestore.createCommunityComment, sqlite.createCommunityComment);
export const hideCommunityComment = pick(firestore.hideCommunityComment, sqlite.hideCommunityComment);
export const deleteCommunityComment = pick(firestore.deleteCommunityComment, sqlite.deleteCommunityComment);
export const getCommunityCommentById = pick(firestore.getCommunityCommentById, sqlite.getCommunityCommentById);
export const toggleCommunityPostLike = pick(firestore.toggleCommunityPostLike, sqlite.toggleCommunityPostLike);
export const createCommunityReport = pick(firestore.createCommunityReport, sqlite.createCommunityReport);
export const listCommunityReports = pick(firestore.listCommunityReports, sqlite.listCommunityReports);
export const updateCommunityReportStatus = pick(
  firestore.updateCommunityReportStatus,
  sqlite.updateCommunityReportStatus,
);
export const listCommunityRoomMessages = pick(
  firestore.listCommunityRoomMessages,
  sqlite.listCommunityRoomMessages,
);
export const insertCommunityRoomMessage = pick(
  firestore.insertCommunityRoomMessage,
  sqlite.insertCommunityRoomMessage,
);
export const listCommunityFeed = pick(firestore.listCommunityFeed, sqlite.listCommunityFeed);
export const followCommunityUser = pick(firestore.followCommunityUser, sqlite.followCommunityUser);
export const unfollowCommunityUser = pick(firestore.unfollowCommunityUser, sqlite.unfollowCommunityUser);
export const listFollowedCommunityUserIds = pick(
  firestore.listFollowedCommunityUserIds,
  sqlite.listFollowedCommunityUserIds,
);
export const isFollowingCommunityUser = pick(
  firestore.isFollowingCommunityUser,
  sqlite.isFollowingCommunityUser,
);
export const followCommunityTopic = pick(firestore.followCommunityTopic, sqlite.followCommunityTopic);
export const unfollowCommunityTopic = pick(firestore.unfollowCommunityTopic, sqlite.unfollowCommunityTopic);
export const listFollowedCommunityTopics = pick(
  firestore.listFollowedCommunityTopics,
  sqlite.listFollowedCommunityTopics,
);
export const isCommunityTopicFollowed = pick(
  firestore.isCommunityTopicFollowed,
  sqlite.isCommunityTopicFollowed,
);
export const listCommunityThreadReplies = pick(
  firestore.listCommunityThreadReplies,
  sqlite.listCommunityThreadReplies,
);
export const createCommunityThreadReply = pick(
  firestore.createCommunityThreadReply,
  sqlite.createCommunityThreadReply,
);

export const listCommunityAnnouncementMessages = pick(
  firestore.listCommunityAnnouncementMessages,
  sqliteExt.listCommunityAnnouncementMessages,
);
export const insertCommunityAnnouncementMessage = pick(
  firestore.insertCommunityAnnouncementMessage,
  sqliteExt.insertCommunityAnnouncementMessage,
);
export const getOrCreateCommunityDmThread = pick(
  firestore.getOrCreateCommunityDmThread,
  sqliteExt.getOrCreateCommunityDmThread,
);
export const listCommunityDmThreads = pick(firestore.listCommunityDmThreads, sqliteExt.listCommunityDmThreads);
export const getCommunityDmThreadForUser = pick(
  firestore.getCommunityDmThreadForUser,
  sqliteExt.getCommunityDmThreadForUser,
);
export const listCommunityDmMessages = pick(firestore.listCommunityDmMessages, sqliteExt.listCommunityDmMessages);
export const insertCommunityDmMessage = pick(firestore.insertCommunityDmMessage, sqliteExt.insertCommunityDmMessage);
export const searchCommunityMembers = pick(firestore.searchCommunityMembers, sqliteExt.searchCommunityMembers);
export const listRoomMentionCandidates = pick(firestore.listRoomMentionCandidates, sqliteExt.listRoomMentionCandidates);
