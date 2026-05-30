import {
  listCommunityPosts,
  setCommunityPostStatus,
  listCommunityReports,
  updateCommunityReportStatus,
  hideCommunityComment,
  deleteCommunityPost,
  deleteCommunityComment,
  pushAudit,
} from '../db.js';
import { broadcastCommunityEvent, forumChannel } from '../communityDelivery.js';

function auditModeration(actor, action, meta) {
  pushAudit({
    actorId: actor.id,
    role: actor.role,
    action,
    customerId: null,
    meta,
  });
}

export function listPostsForModeration(opts) {
  return listCommunityPosts({ ...opts, includeHidden: true });
}

export function listReports(opts) {
  return listCommunityReports(opts);
}

export function resolveReport(reportId, status, extras) {
  return updateCommunityReportStatus(reportId, status, extras);
}

/**
 * UC-11: ẩn hoặc xóa bài viết; ghi audit_log.
 * @param {{ id: string, role: string }} actor
 */
export function moderatePost(actor, postId, action) {
  if (action === 'hide') {
    const ok = setCommunityPostStatus(postId, 'hidden');
    if (ok) {
      auditModeration(actor, 'community.post.hide', {
        targetType: 'post',
        targetId: postId,
        action: 'hide',
      });
      broadcastCommunityEvent(forumChannel(), { type: 'community_post_removed', postId });
    }
    return ok;
  }
  if (action === 'delete') {
    const ok = deleteCommunityPost(postId, actor.id, true);
    if (ok) {
      auditModeration(actor, 'community.post.delete', {
        targetType: 'post',
        targetId: postId,
        action: 'delete',
      });
      broadcastCommunityEvent(forumChannel(), { type: 'community_post_removed', postId });
    }
    return ok;
  }
  return false;
}

/**
 * UC-11: ẩn hoặc xóa bình luận; ghi audit_log.
 */
export function moderateComment(actor, commentId, postId, action) {
  if (action === 'hide') {
    const ok = hideCommunityComment(commentId);
    if (ok) {
      auditModeration(actor, 'community.comment.hide', {
        targetType: 'comment',
        targetId: commentId,
        postId: postId || null,
        action: 'hide',
      });
      broadcastCommunityEvent(forumChannel(), {
        type: 'community_comment_removed',
        postId,
        commentId,
      });
    }
    return ok;
  }
  if (action === 'delete') {
    const ok = deleteCommunityComment(commentId);
    if (ok) {
      auditModeration(actor, 'community.comment.delete', {
        targetType: 'comment',
        targetId: commentId,
        postId: postId || null,
        action: 'delete',
      });
      broadcastCommunityEvent(forumChannel(), {
        type: 'community_comment_removed',
        postId,
        commentId,
      });
    }
    return ok;
  }
  return false;
}
