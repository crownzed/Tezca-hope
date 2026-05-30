import {
  listCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  deleteCommunityPost,
  listCommunityComments,
  createCommunityComment,
  toggleCommunityPostLike,
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

export function likePost(postId, userId) {
  return toggleCommunityPostLike(postId, userId);
}

export function reportContent(input) {
  return createCommunityReport(input);
}
