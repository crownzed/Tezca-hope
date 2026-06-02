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

export async function listPosts(opts) {
  return listCommunityPosts(opts);
}

export async function listFeed(opts) {
  return listCommunityFeed(opts);
}

export async function followUser(followerId, followingId) {
  return followCommunityUser(followerId, followingId);
}

export async function unfollowUser(followerId, followingId) {
  return unfollowCommunityUser(followerId, followingId);
}

export async function listFollowedUserIds(followerId) {
  return listFollowedCommunityUserIds(followerId);
}

export async function followTopic(userId, topic) {
  return followCommunityTopic(userId, topic);
}

export async function unfollowTopic(userId, topic) {
  return unfollowCommunityTopic(userId, topic);
}

export async function listFollowedTopics(userId) {
  return listFollowedCommunityTopics(userId);
}

export async function listThreadReplies(parentPostId, opts) {
  return listCommunityThreadReplies(parentPostId, opts);
}

export async function addThreadReply(input) {
  const post = await createCommunityThreadReply(input);
  if (post) {
    broadcastCommunityEvent(forumChannel(), { type: 'community_post', post });
  }
  return post;
}

export async function getPost(postId, viewerId, opts) {
  return getCommunityPostById(postId, viewerId, opts);
}

export async function createPost(input) {
  const post = await createCommunityPost(input);
  if (post) {
    broadcastCommunityEvent(forumChannel(), { type: 'community_post', post });
  }
  return post;
}

export async function removeOwnPost(postId, userId, isAdmin) {
  const ok = await deleteCommunityPost(postId, userId, isAdmin);
  if (ok) {
    broadcastCommunityEvent(forumChannel(), { type: 'community_post_removed', postId });
  }
  return ok;
}

export async function listComments(postId, opts) {
  return listCommunityComments(postId, opts);
}

export async function addComment(input) {
  const comment = await createCommunityComment(input);
  if (comment) {
    broadcastCommunityEvent(forumChannel(), {
      type: 'community_comment',
      postId: input.postId,
      comment,
    });
  }
  return comment;
}

export async function likePost(postId, userId) {
  return toggleCommunityPostLike(postId, userId);
}

export async function reportContent(input) {
  return createCommunityReport(input);
}
