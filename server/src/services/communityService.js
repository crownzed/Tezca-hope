import {
  listCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  deleteCommunityPost,
  updateCommunityPost,
  listCommunityComments,
  createCommunityComment,
  updateCommunityComment,
  deleteOwnCommunityComment,
  toggleCommunityPostLike,
  toggleCommunityPostBookmark,
  listCommunityBookmarks,
  createCommunityReport,
  listCommunityFeed,
  followCommunityUser,
  unfollowCommunityUser,
  listFollowedCommunityUserIds,
  followCommunityTopic,
  unfollowCommunityTopic,
  listFollowedCommunityTopics,
  listCommunityThreadReplies,
  createCommunityThreadReply,
  createCommunityNotification,
  listCommunityNotifications,
  countUnreadCommunityNotifications,
  markCommunityNotificationsRead,
  searchCommunityPosts,
  getCommunityPublicProfile,
  listCommunityPostsByUser,
  getCommunityUserSettings,
  updateCommunityUserSettings,
  updateCommunityPublicProfile,
} from '../db.js';
import { randomUUID } from 'node:crypto';
import { broadcastCommunityEvent, forumChannel } from '../communityDelivery.js';
import { moderateText, moderationMessage } from '../contentModeration.js';
import { pushAudit } from '../db.js';

/**
 * Lỗi nội dung vi phạm (chặn). Route bắt err.code === 'CONTENT_VIOLATION' → 422.
 */
export class ContentViolationError extends Error {
  constructor(result) {
    super(moderationMessage(result));
    this.code = 'CONTENT_VIOLATION';
    this.status = 422;
    this.categories = result.categories;
    this.reasons = result.reasons;
  }
}

/**
 * Kiểm duyệt nội dung trước khi lưu.
 * - block  → ném ContentViolationError (không lưu).
 * - flag   → cho lưu nhưng ghi audit_log để kiểm duyệt viên rà soát.
 * - allow  → bỏ qua.
 * @param {{ userId: string, kind: string, text: string }} arg
 */
function guardContent({ userId, kind, text }) {
  const result = moderateText(text);
  if (result.action === 'block') {
    throw new ContentViolationError(result);
  }
  if (result.action === 'flag') {
    try {
      pushAudit({
        actorId: userId,
        role: 'user',
        action: 'content_flagged',
        meta: { kind, categories: result.categories, reasons: result.reasons, score: result.score },
      });
    } catch {
      /* không chặn luồng chính nếu ghi audit lỗi */
    }
  }
  return result;
}

export { guardContent };

// Gửi thông báo + bắn realtime để cập nhật badge
function notify({ userId, actorId, type, postId = null, commentId = null, threadId = null, preview = null }) {
  if (!userId || userId === actorId) return;
  try {
    createCommunityNotification({
      id: randomUUID(),
      userId,
      actorId,
      type,
      postId,
      commentId,
      threadId,
      preview,
    });
    broadcastCommunityEvent(`notifications:${userId}`, {
      type: 'community_notification',
      unread: countUnreadCommunityNotifications(userId),
    });
  } catch {
    /* không chặn luồng chính nếu thông báo lỗi */
  }
}

export function listNotifications(userId, opts) {
  return listCommunityNotifications(userId, opts);
}

export function countUnreadNotifications(userId) {
  return countUnreadCommunityNotifications(userId);
}

export function markNotificationsRead(userId, ids) {
  return markCommunityNotificationsRead(userId, ids);
}

export function listPosts(opts) {
  return listCommunityPosts(opts);
}

export function listFeed(opts) {
  return listCommunityFeed(opts);
}

export function followUser(followerId, followingId) {
  const result = followCommunityUser(followerId, followingId);
  notify({ userId: followingId, actorId: followerId, type: 'follow' });
  return result;
}

export function unfollowUser(followerId, followingId) {
  return unfollowCommunityUser(followerId, followingId);
}

export function listFollowedUserIds(followerId) {
  return listFollowedCommunityUserIds(followerId);
}

export function followTopic(userId, topic) {
  return followCommunityTopic(userId, topic);
}

export function unfollowTopic(userId, topic) {
  return unfollowCommunityTopic(userId, topic);
}

export function listFollowedTopics(userId) {
  return listFollowedCommunityTopics(userId);
}

export function listThreadReplies(parentPostId, opts) {
  return listCommunityThreadReplies(parentPostId, opts);
}

export function addThreadReply(input) {
  guardContent({ userId: input.userId, kind: 'thread_reply', text: input.content });
  const post = createCommunityThreadReply(input);
  if (post) {
    broadcastCommunityEvent(forumChannel(), { type: 'community_post', post });
    // Thông báo cho chủ bài gốc
    if (input.parentPostId) {
      const parent = getCommunityPostById(input.parentPostId, input.userId);
      if (parent && parent.userId) {
        notify({
          userId: parent.userId,
          actorId: input.userId,
          type: 'reply',
          postId: input.parentPostId,
          preview: String(input.content || '').slice(0, 140),
        });
      }
    }
  }
  return post;
}

export function getPost(postId, viewerId, opts) {
  return getCommunityPostById(postId, viewerId, opts);
}

export function createPost(input) {
  guardContent({ userId: input.userId, kind: 'post', text: input.content });
  const post = createCommunityPost(input);
  if (post) {
    broadcastCommunityEvent(forumChannel(), { type: 'community_post', post });
  }
  return post;
}

export function removeOwnPost(postId, userId, isAdmin) {
  return deleteCommunityPost(postId, userId, isAdmin);
}

export function editPost({ postId, userId, content, imageUrl, isAdmin }) {
  if (!isAdmin) guardContent({ userId, kind: 'post_edit', text: content });
  const result = updateCommunityPost({ postId, userId, content, imageUrl, isAdmin });
  if (result.post) {
    broadcastCommunityEvent(forumChannel(), { type: 'community_post_updated', post: result.post });
  }
  return result;
}

export function listComments(postId, opts) {
  return listCommunityComments(postId, opts);
}

export function addComment(input) {
  guardContent({ userId: input.userId, kind: 'comment', text: input.content });
  const comment = createCommunityComment(input);
  if (comment) {
    broadcastCommunityEvent(forumChannel(), {
      type: 'community_comment',
      postId: input.postId,
      comment,
    });
    // Thông báo cho chủ bài viết
    const post = getCommunityPostById(input.postId, input.userId);
    if (post && post.userId) {
      notify({
        userId: post.userId,
        actorId: input.userId,
        type: 'comment',
        postId: input.postId,
        commentId: comment.id,
        preview: String(input.content || '').slice(0, 140),
      });
    }
  }
  return comment;
}

export function editComment({ commentId, userId, content, isAdmin }) {
  if (!isAdmin) guardContent({ userId, kind: 'comment_edit', text: content });
  return updateCommunityComment({ commentId, userId, content, isAdmin });
}

export function removeComment({ commentId, userId, isAdmin }) {
  return deleteOwnCommunityComment(commentId, userId, isAdmin);
}

export function toggleBookmark(postId, userId) {
  return toggleCommunityPostBookmark(postId, userId);
}

export function listBookmarks(userId, opts) {
  return listCommunityBookmarks(userId, opts);
}

export function searchPosts(opts) {
  return searchCommunityPosts(opts);
}

export function likePost(postId, userId) {
  const result = toggleCommunityPostLike(postId, userId);
  // Chỉ thông báo khi vừa like (không phải bỏ like)
  if (result && result.liked) {
    const post = getCommunityPostById(postId, userId);
    if (post && post.userId) {
      notify({ userId: post.userId, actorId: userId, type: 'like', postId });
    }
  }
  return result;
}

export function reportContent(input) {
  return createCommunityReport(input);
}

// ===== Hồ sơ công khai =====

export function getPublicProfile(userId, viewerId) {
  return getCommunityPublicProfile(userId, viewerId);
}

export function listPostsByUser(userId, opts) {
  return listCommunityPostsByUser(userId, opts);
}

export function getMySettings(userId) {
  return getCommunityUserSettings(userId);
}

export function updateMySettings(userId, patch) {
  return updateCommunityUserSettings(userId, patch);
}

export function updateMyPublicProfile(userId, patch) {
  return updateCommunityPublicProfile(userId, patch);
}
