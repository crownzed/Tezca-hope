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
} from '../db.js';
import { broadcastCommunityEvent, forumChannel } from '../communityDelivery.js';

export function listPosts(opts) {
  return listCommunityPosts(opts);
}

export function listFeed(opts) {
  return listCommunityFeed(opts);
}

export function followUser(followerId, followingId) {
  return followCommunityUser(followerId, followingId);
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
  const post = createCommunityThreadReply(input);
  if (post) {
    broadcastCommunityEvent(forumChannel(), { type: 'community_post', post });
  }
  return post;
}

export function getPost(postId, viewerId, opts) {
  return getCommunityPostById(postId, viewerId, opts);
}

export function createPost(input) {
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
  const comment = createCommunityComment(input);
  if (comment) {
    broadcastCommunityEvent(forumChannel(), {
      type: 'community_comment',
      postId: input.postId,
      comment,
    });
  }
  return comment;
}

export function editComment({ commentId, userId, content, isAdmin }) {
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

export function likePost(postId, userId) {
  return toggleCommunityPostLike(postId, userId);
}

export function reportContent(input) {
  return createCommunityReport(input);
}
