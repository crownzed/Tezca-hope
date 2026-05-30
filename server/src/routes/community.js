import { Router } from 'express';
import { authMiddlewareRoles } from '../auth.js';
import { isValidPostTopic, isValidRoomTopic } from '../communityTopics.js';
import * as communityService from '../services/communityService.js';
import * as realtimeChatService from '../services/realtimeChatService.js';
import * as communityExtendedService from '../services/communityExtendedService.js';

export const communityRouter = Router();
const requireMember = authMiddlewareRoles(['user', 'expert', 'admin']);

const FEED_MODES = new Set(['for_you', 'following', 'latest']);

communityRouter.get('/feed', requireMember, (req, res) => {
  const mode = String(req.query.mode || 'for_you');
  if (!FEED_MODES.has(mode)) {
    res.status(400).json({ error: 'Chế độ feed không hợp lệ' });
    return;
  }
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  if (topic && !isValidPostTopic(topic)) {
    res.status(400).json({ error: 'Chủ đề không hợp lệ' });
    return;
  }
  const beforeTs = req.query.before ? Number(req.query.before) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 30;
  const pageLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 30;
  const posts = communityService.listFeed({
    mode,
    topic,
    beforeTs: Number.isFinite(beforeTs) ? beforeTs : undefined,
    limit: pageLimit,
    viewerId: req.user.sub,
  });
  const nextCursor =
    posts.length >= pageLimit
      ? String(posts[posts.length - 1].createdAt)
      : undefined;
  res.json({ posts, nextCursor, mode });
});

communityRouter.get('/users/following', requireMember, (req, res) => {
  const userIds = communityService.listFollowedUserIds(req.user.sub);
  res.json({ userIds });
});

communityRouter.post('/users/:userId/follow', requireMember, (req, res) => {
  const followingId = String(req.params.userId);
  communityService.followUser(req.user.sub, followingId);
  res.json({ ok: true });
});

communityRouter.delete('/users/:userId/follow', requireMember, (req, res) => {
  const followingId = String(req.params.userId);
  communityService.unfollowUser(req.user.sub, followingId);
  res.json({ ok: true });
});

communityRouter.get('/topics/following', requireMember, (req, res) => {
  const topics = communityService.listFollowedTopics(req.user.sub);
  res.json({ topics });
});

communityRouter.post('/topics/:topic/follow', requireMember, (req, res) => {
  const topic = String(req.params.topic);
  if (!isValidPostTopic(topic)) {
    res.status(400).json({ error: 'Chủ đề không hợp lệ' });
    return;
  }
  communityService.followTopic(req.user.sub, topic);
  res.json({ ok: true });
});

communityRouter.delete('/topics/:topic/follow', requireMember, (req, res) => {
  const topic = String(req.params.topic);
  if (!isValidPostTopic(topic)) {
    res.status(400).json({ error: 'Chủ đề không hợp lệ' });
    return;
  }
  communityService.unfollowTopic(req.user.sub, topic);
  res.json({ ok: true });
});

communityRouter.get('/posts', requireMember, (req, res) => {
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  if (topic && !isValidPostTopic(topic)) {
    res.status(400).json({ error: 'Chủ đề không hợp lệ' });
    return;
  }
  const beforeTs = req.query.before ? Number(req.query.before) : undefined;
  const posts = communityService.listPosts({
    topic,
    beforeTs: Number.isFinite(beforeTs) ? beforeTs : undefined,
    viewerId: req.user.sub,
  });
  res.json({ posts });
});

communityRouter.post('/posts', requireMember, (req, res) => {
  const topic = String(req.body?.topic || 'general');
  const content = String(req.body?.content || '').trim();
  const rawImage = String(req.body?.imageUrl || '').trim();
  if (rawImage.length > 2_000_000) {
    res.status(400).json({ error: 'Ảnh quá lớn (tối đa ~1.5 MB sau nén)' });
    return;
  }
  const imageUrl = rawImage;
  if (!isValidPostTopic(topic)) {
    res.status(400).json({ error: 'Chủ đề không hợp lệ' });
    return;
  }
  if (!content || content.length > 4000) {
    res.status(400).json({ error: 'Nội dung bài viết không hợp lệ (tối đa 4000 ký tự)' });
    return;
  }
  const post = communityService.createPost({
    id: crypto.randomUUID(),
    userId: req.user.sub,
    topic,
    content,
    imageUrl,
  });
  res.status(201).json({ post });
});

communityRouter.get('/posts/:postId', requireMember, (req, res) => {
  const post = communityService.getPost(String(req.params.postId), req.user.sub);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  res.json({ post });
});

communityRouter.delete('/posts/:postId', requireMember, (req, res) => {
  const postId = String(req.params.postId);
  const ok = communityService.removeOwnPost(
    postId,
    req.user.sub,
    req.dbUser.role === 'admin',
  );
  if (!ok) {
    res.status(403).json({ error: 'Không thể xóa bài viết' });
    return;
  }
  res.json({ ok: true });
});

communityRouter.get('/posts/:postId/comments', requireMember, (req, res) => {
  const postId = String(req.params.postId);
  const post = communityService.getPost(postId, req.user.sub);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  res.json({ comments: communityService.listComments(postId) });
});

communityRouter.get('/posts/:postId/replies', requireMember, (req, res) => {
  const postId = String(req.params.postId);
  const post = communityService.getPost(postId, req.user.sub);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  const replies = communityService.listThreadReplies(postId, { viewerId: req.user.sub });
  res.json({ replies });
});

communityRouter.post('/posts/:postId/reply', requireMember, (req, res) => {
  const postId = String(req.params.postId);
  const content = String(req.body?.content || '').trim();
  const rawImage = String(req.body?.imageUrl || '').trim();
  if (rawImage.length > 2_000_000) {
    res.status(400).json({ error: 'Ảnh quá lớn (tối đa ~1.5 MB sau nén)' });
    return;
  }
  const imageUrl = rawImage;
  if (!content || content.length > 4000) {
    res.status(400).json({ error: 'Nội dung phản hồi không hợp lệ (tối đa 4000 ký tự)' });
    return;
  }
  const post = communityService.addThreadReply({
    id: crypto.randomUUID(),
    userId: req.user.sub,
    parentPostId: postId,
    content,
    imageUrl,
  });
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  res.status(201).json({ post });
});

communityRouter.post('/posts/:postId/comments', requireMember, (req, res) => {
  const postId = String(req.params.postId);
  const content = String(req.body?.content || '').trim();
  if (!content || content.length > 1000) {
    res.status(400).json({ error: 'Nội dung bình luận không hợp lệ' });
    return;
  }
  const comment = communityService.addComment({
    id: crypto.randomUUID(),
    postId,
    userId: req.user.sub,
    content,
  });
  if (!comment) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  res.status(201).json({ comment });
});

communityRouter.post('/posts/:postId/like', requireMember, (req, res) => {
  const result = communityService.likePost(String(req.params.postId), req.user.sub);
  if (!result) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  const post = communityService.getPost(String(req.params.postId), req.user.sub);
  res.json({ ...result, likesCount: post?.likesCount ?? 0 });
});

communityRouter.post('/posts/:postId/report', requireMember, (req, res) => {
  const postId = String(req.params.postId);
  const post = communityService.getPost(postId, req.user.sub);
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  const report = communityService.reportContent({
    id: crypto.randomUUID(),
    targetType: 'post',
    targetId: postId,
    reporterId: req.user.sub,
    reason: reason || 'Báo cáo từ người dùng',
  });
  res.status(201).json({ report });
});

communityRouter.get('/rooms/:topic/messages', requireMember, (req, res) => {
  const topic = String(req.params.topic);
  if (!isValidRoomTopic(topic)) {
    res.status(400).json({ error: 'Phòng chat không hợp lệ' });
    return;
  }
  const since = req.query.since ? Number(req.query.since) : undefined;
  const messages = realtimeChatService.listRoomMessages(topic, {
    sinceTs: Number.isFinite(since) ? since : undefined,
  });
  res.json({ messages });
});

communityRouter.post('/rooms/:topic/messages', requireMember, (req, res) => {
  const topic = String(req.params.topic);
  const content = String(req.body?.content || '').trim();
  if (!isValidRoomTopic(topic)) {
    res.status(400).json({ error: 'Phòng chat không hợp lệ' });
    return;
  }
  if (!content || content.length > 500) {
    res.status(400).json({ error: 'Tin nhắn không hợp lệ (tối đa 500 ký tự)' });
    return;
  }
  const message = realtimeChatService.sendRoomMessage({
    id: crypto.randomUUID(),
    topic,
    userId: req.user.sub,
    content,
  });
  res.status(201).json({ message });
});

communityRouter.get('/rooms/:topic/mention-candidates', requireMember, (req, res) => {
  const topic = String(req.params.topic);
  if (!isValidRoomTopic(topic)) {
    res.status(400).json({ error: 'Phòng chat không hợp lệ' });
    return;
  }
  const q = String(req.query.q || '').trim();
  const members = communityExtendedService.mentionCandidates(topic, { query: q });
  res.json({ members });
});

communityRouter.get('/announcements/messages', requireMember, (req, res) => {
  const since = req.query.since ? Number(req.query.since) : undefined;
  const messages = communityExtendedService.listAnnouncements({
    sinceTs: Number.isFinite(since) ? since : undefined,
  });
  res.json({ messages });
});

communityRouter.post('/announcements/messages', requireMember, (req, res) => {
  if (!communityExtendedService.canPostAnnouncement(req.dbUser.role)) {
    res.status(403).json({ error: 'Chỉ chuyên gia hoặc quản trị viên được đăng thông báo' });
    return;
  }
  const content = String(req.body?.content || '').trim();
  if (!content || content.length > 2000) {
    res.status(400).json({ error: 'Nội dung thông báo không hợp lệ (tối đa 2000 ký tự)' });
    return;
  }
  const message = communityExtendedService.postAnnouncement({
    id: crypto.randomUUID(),
    userId: req.user.sub,
    content,
  });
  res.status(201).json({ message });
});

communityRouter.get('/dm/threads', requireMember, (req, res) => {
  const threads = communityExtendedService.listDmThreads(req.user.sub);
  res.json({ threads });
});

communityRouter.get('/dm/members', requireMember, (req, res) => {
  const q = String(req.query.q || '').trim();
  const members = communityExtendedService.searchMembers({
    query: q,
    excludeUserId: req.user.sub,
  });
  res.json({ members });
});

communityRouter.post('/dm/threads', requireMember, (req, res) => {
  const otherUserId = String(req.body?.otherUserId || '').trim();
  if (!otherUserId) {
    res.status(400).json({ error: 'Thiếu người nhận' });
    return;
  }
  if (otherUserId === req.user.sub) {
    res.status(400).json({ error: 'Không thể nhắn tin với chính mình' });
    return;
  }
  const thread = communityExtendedService.openDmThread(req.user.sub, otherUserId);
  if (!thread) {
    res.status(404).json({ error: 'Không tạo được cuộc trò chuyện' });
    return;
  }
  res.status(201).json({ thread });
});

communityRouter.get('/dm/threads/:threadId', requireMember, (req, res) => {
  const thread = communityExtendedService.getDmThread(String(req.params.threadId), req.user.sub);
  if (!thread) {
    res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    return;
  }
  res.json({ thread });
});

communityRouter.get('/dm/threads/:threadId/messages', requireMember, (req, res) => {
  const threadId = String(req.params.threadId);
  const since = req.query.since ? Number(req.query.since) : undefined;
  const messages = communityExtendedService.listDmMessages(threadId, req.user.sub, {
    sinceTs: Number.isFinite(since) ? since : undefined,
  });
  if (!messages) {
    res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    return;
  }
  res.json({ messages });
});

communityRouter.post('/dm/threads/:threadId/messages', requireMember, (req, res) => {
  const threadId = String(req.params.threadId);
  const content = String(req.body?.content || '').trim();
  if (!content || content.length > 2000) {
    res.status(400).json({ error: 'Tin nhắn không hợp lệ (tối đa 2000 ký tự)' });
    return;
  }
  const message = communityExtendedService.sendDmMessage({
    id: crypto.randomUUID(),
    threadId,
    senderId: req.user.sub,
    content,
  });
  if (!message) {
    res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    return;
  }
  res.json({ message });
});
