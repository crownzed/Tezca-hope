import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from '../firestore.js';
import { FS } from '../firestoreCollections.js';
import { getAuthorProfile, searchUsersSqlite } from '../firestoreUserProfile.js';

function db() {
  return getFirestore();
}

function dmPair(userId1, userId2) {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

function dmThreadDocId(userId1, userId2) {
  const [a, b] = dmPair(userId1, userId2);
  return `${a}__${b}`;
}

function likeDocId(postId, userId) {
  return `${postId}__${userId}`;
}

function followDocId(followerId, followingId) {
  return `${followerId}__${followingId}`;
}

function topicFollowDocId(userId, topic) {
  return `${userId}__${topic}`;
}

async function isPostLiked(postId, viewerId) {
  if (!viewerId) return false;
  const snap = await db().collection(FS.POST_LIKES).doc(likeDocId(postId, viewerId)).get();
  return snap.exists;
}

async function mapPostDoc(snap, viewerId, { includeHidden = false } = {}) {
  if (!snap.exists) return null;
  const d = snap.data();
  if (!includeHidden && d.status !== 'published') return null;
  if (includeHidden && d.status !== 'published' && d.status !== 'hidden') return null;
  const likedByMe = await isPostLiked(snap.id, viewerId);
  return {
    id: snap.id,
    userId: d.userId,
    authorName: d.authorName || 'Thành viên',
    authorRole: d.authorRole || 'user',
    authorSpecialty: d.authorSpecialty || '',
    topic: d.topic,
    content: d.content,
    imageUrl: d.imageUrl || '',
    likesCount: d.likesCount ?? 0,
    likedByMe,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    commentCount: d.commentCount ?? 0,
    threadReplyCount: d.threadReplyCount ?? 0,
    parentPostId: d.parentPostId ?? null,
  };
}

async function mapPostDocs(snaps, viewerId, opts = {}) {
  const out = [];
  for (const snap of snaps) {
    const row = await mapPostDoc(snap, viewerId, opts);
    if (row) out.push(row);
  }
  return out;
}

export async function listCommunityPosts({
  topic,
  limit = 30,
  beforeTs,
  viewerId,
  includeHidden = false,
} = {}) {
  const cap = Math.min(Math.max(limit, 1), 50);
  let q = db().collection(FS.POSTS).where('parentPostId', '==', null);
  if (!includeHidden) q = q.where('status', '==', 'published');
  else q = q.where('status', 'in', ['published', 'hidden']);
  if (topic) q = q.where('topic', '==', topic);
  if (beforeTs) q = q.where('createdAt', '<', beforeTs);
  q = q.orderBy('createdAt', 'desc').limit(cap);
  const snap = await q.get();
  return mapPostDocs(snap.docs, viewerId, { includeHidden });
}

export async function getCommunityPostById(postId, viewerId, { includeHidden = false } = {}) {
  const snap = await db().collection(FS.POSTS).doc(postId).get();
  if (!snap.exists) return null;
  return mapPostDoc(snap, viewerId, { includeHidden });
}

export async function createCommunityPost({
  id,
  userId,
  topic,
  content,
  imageUrl = '',
  parentPostId = null,
}) {
  const profile = getAuthorProfile(userId);
  const now = Date.now();
  const data = {
    userId,
    authorName: profile.name,
    authorRole: profile.role,
    authorSpecialty: profile.specialty || '',
    topic,
    content,
    imageUrl: imageUrl || '',
    likesCount: 0,
    commentCount: 0,
    threadReplyCount: 0,
    status: 'published',
    createdAt: now,
    updatedAt: now,
    parentPostId: parentPostId ?? null,
  };
  await db().collection(FS.POSTS).doc(id).set(data);
  if (parentPostId) {
    await db()
      .collection(FS.POSTS)
      .doc(parentPostId)
      .update({ threadReplyCount: FieldValue.increment(1), updatedAt: now })
      .catch(() => {});
  }
  return getCommunityPostById(id, userId);
}

export async function createCommunityThreadReply({ id, userId, parentPostId, content, imageUrl = '' }) {
  const parent = await db().collection(FS.POSTS).doc(parentPostId).get();
  if (!parent.exists || parent.data()?.status !== 'published') return null;
  return createCommunityPost({
    id,
    userId,
    topic: parent.data().topic,
    content,
    imageUrl,
    parentPostId,
  });
}

export async function listCommunityThreadReplies(parentPostId, { beforeTs, limit = 30, viewerId } = {}) {
  const cap = Math.min(Math.max(limit, 1), 50);
  let q = db()
    .collection(FS.POSTS)
    .where('parentPostId', '==', parentPostId)
    .where('status', '==', 'published');
  if (beforeTs) q = q.where('createdAt', '>', beforeTs);
  q = q.orderBy('createdAt', 'asc').limit(cap);
  const snap = await q.get();
  return mapPostDocs(snap.docs, viewerId);
}

export async function setCommunityPostStatus(postId, status) {
  const now = Date.now();
  const ref = db().collection(FS.POSTS).doc(postId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ status, updatedAt: now });
  return true;
}

export async function deleteCommunityPost(postId, userId, isAdmin = false) {
  const ref = db().collection(FS.POSTS).doc(postId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const d = snap.data();
  if (!isAdmin && d.userId !== userId) return false;
  const batch = db().batch();
  batch.delete(ref);
  const likes = await db().collection(FS.POST_LIKES).where('postId', '==', postId).get();
  likes.docs.forEach((doc) => batch.delete(doc.ref));
  const comments = await db().collection(FS.COMMENTS).where('postId', '==', postId).get();
  comments.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return true;
}

export async function listCommunityComments(postId, { includeHidden = false } = {}) {
  let q = db().collection(FS.COMMENTS).where('postId', '==', postId);
  if (!includeHidden) q = q.where('status', '==', 'published');
  q = q.orderBy('createdAt', 'asc');
  const snap = await q.get();
  return snap.docs.map((doc) => {
    const r = doc.data();
    return {
      id: doc.id,
      postId: r.postId,
      userId: r.userId,
      authorName: r.authorName,
      authorRole: r.authorRole,
      authorSpecialty: r.authorSpecialty || '',
      content: r.content,
      status: r.status,
      createdAt: r.createdAt,
    };
  });
}

export async function createCommunityComment({ id, postId, userId, content }) {
  const post = await db().collection(FS.POSTS).doc(postId).get();
  if (!post.exists || post.data()?.status !== 'published') return null;
  const profile = getAuthorProfile(userId);
  const now = Date.now();
  const data = {
    postId,
    userId,
    authorName: profile.name,
    authorRole: profile.role,
    authorSpecialty: profile.specialty || '',
    content,
    status: 'published',
    createdAt: now,
  };
  await db().collection(FS.COMMENTS).doc(id).set(data);
  await db()
    .collection(FS.POSTS)
    .doc(postId)
    .update({ commentCount: FieldValue.increment(1), updatedAt: now });
  return {
    id,
    postId,
    userId,
    authorName: profile.name,
    authorRole: profile.role,
    authorSpecialty: profile.specialty || '',
    content,
    status: 'published',
    createdAt: now,
  };
}

export async function toggleCommunityPostLike(postId, userId) {
  const postRef = db().collection(FS.POSTS).doc(postId);
  const post = await postRef.get();
  if (!post.exists) return null;
  const likeRef = db().collection(FS.POST_LIKES).doc(likeDocId(postId, userId));
  const likeSnap = await likeRef.get();
  const now = Date.now();
  if (likeSnap.exists) {
    await likeRef.delete();
    await postRef.update({
      likesCount: FieldValue.increment(-1),
      updatedAt: now,
    });
    return { liked: false };
  }
  await likeRef.set({ postId, userId, createdAt: now });
  await postRef.update({
    likesCount: FieldValue.increment(1),
    updatedAt: now,
  });
  return { liked: true };
}

export async function createCommunityReport({ id, targetType, targetId, reporterId, reason }) {
  const now = Date.now();
  await db()
    .collection(FS.REPORTS)
    .doc(id)
    .set({
      targetType,
      targetId,
      reporterId,
      reason,
      status: 'pending',
      createdAt: now,
    });
  return { id, targetType, targetId, status: 'pending' };
}

export async function listCommunityReports({ status } = {}) {
  let q = db().collection(FS.REPORTS);
  if (status) q = q.where('status', '==', status);
  q = q.orderBy('createdAt', 'desc').limit(100);
  const snap = await q.get();
  return snap.docs.map((doc) => {
    const r = doc.data();
    const reporter = getAuthorProfile(r.reporterId);
    return {
      id: doc.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reporterId: r.reporterId,
      reporterName: reporter.name,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    };
  });
}

export async function updateCommunityReportStatus(reportId, status) {
  const ref = db().collection(FS.REPORTS).doc(reportId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ status });
  return true;
}

export async function listCommunityRoomMessages(topic, { sinceTs, limit = 80 } = {}) {
  const cap = Math.min(Math.max(limit, 1), 120);
  let q = db()
    .collection(FS.ROOM_MESSAGES)
    .where('topic', '==', topic)
    .where('status', '==', 'published');
  if (sinceTs) q = q.where('createdAt', '>', sinceTs);
  q = q.orderBy('createdAt', 'asc').limit(cap);
  const snap = await q.get();
  return snap.docs.map((doc) => {
    const r = doc.data();
    return {
      id: doc.id,
      topic: r.topic,
      userId: r.userId,
      authorName: r.authorName,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.createdAt,
    };
  });
}

export async function insertCommunityRoomMessage({ id, topic, userId, content }) {
  const profile = getAuthorProfile(userId);
  const now = Date.now();
  const data = {
    topic,
    userId,
    authorName: profile.name,
    authorRole: profile.role,
    content,
    status: 'published',
    createdAt: now,
  };
  await db().collection(FS.ROOM_MESSAGES).doc(id).set(data);
  return {
    id,
    topic,
    userId,
    authorName: profile.name,
    authorRole: profile.role,
    content,
    createdAt: now,
  };
}

export async function hideCommunityComment(commentId) {
  const ref = db().collection(FS.COMMENTS).doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ status: 'hidden' });
  return true;
}

export async function deleteCommunityComment(commentId) {
  const ref = db().collection(FS.COMMENTS).doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const postId = snap.data()?.postId;
  await ref.delete();
  if (postId) {
    await db()
      .collection(FS.POSTS)
      .doc(postId)
      .update({ commentCount: FieldValue.increment(-1), updatedAt: Date.now() })
      .catch(() => {});
  }
  return true;
}

export async function getCommunityCommentById(commentId) {
  const snap = await db().collection(FS.COMMENTS).doc(commentId).get();
  if (!snap.exists) return null;
  const r = snap.data();
  return { id: snap.id, postId: r.postId };
}

export async function followCommunityUser(followerId, followingId) {
  if (followerId === followingId) return false;
  const now = Date.now();
  await db()
    .collection(FS.USER_FOLLOWS)
    .doc(followDocId(followerId, followingId))
    .set({ followerId, followingId, createdAt: now }, { merge: true });
  return true;
}

export async function unfollowCommunityUser(followerId, followingId) {
  await db().collection(FS.USER_FOLLOWS).doc(followDocId(followerId, followingId)).delete();
}

export async function listFollowedCommunityUserIds(followerId) {
  const snap = await db().collection(FS.USER_FOLLOWS).where('followerId', '==', followerId).get();
  return snap.docs.map((d) => d.data().followingId);
}

export async function isFollowingCommunityUser(followerId, followingId) {
  const snap = await db()
    .collection(FS.USER_FOLLOWS)
    .doc(followDocId(followerId, followingId))
    .get();
  return snap.exists;
}

export async function followCommunityTopic(userId, topic) {
  const now = Date.now();
  await db()
    .collection(FS.TOPIC_FOLLOWS)
    .doc(topicFollowDocId(userId, topic))
    .set({ userId, topic, createdAt: now }, { merge: true });
}

export async function unfollowCommunityTopic(userId, topic) {
  await db().collection(FS.TOPIC_FOLLOWS).doc(topicFollowDocId(userId, topic)).delete();
}

export async function listFollowedCommunityTopics(userId) {
  const snap = await db().collection(FS.TOPIC_FOLLOWS).where('userId', '==', userId).get();
  return snap.docs
    .map((d) => ({ topic: d.data().topic, createdAt: d.data().createdAt ?? 0 }))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => r.topic);
}

export async function isCommunityTopicFollowed(userId, topic) {
  const snap = await db().collection(FS.TOPIC_FOLLOWS).doc(topicFollowDocId(userId, topic)).get();
  return snap.exists;
}

export async function listCommunityFeed({
  mode = 'for_you',
  topic,
  limit = 30,
  beforeTs,
  viewerId,
} = {}) {
  const cap = Math.min(Math.max(limit, 1), 50);
  const fetchLimit = mode === 'following' ? Math.min(cap * 4, 80) : cap;

  let q = db()
    .collection(FS.POSTS)
    .where('status', '==', 'published')
    .where('parentPostId', '==', null);
  if (topic) q = q.where('topic', '==', topic);
  if (beforeTs) q = q.where('createdAt', '<', beforeTs);
  q = q.orderBy('createdAt', 'desc').limit(fetchLimit);
  const snap = await q.get();
  let rows = await mapPostDocs(snap.docs, viewerId);

  if (mode === 'following' && viewerId) {
    const [userIds, topics] = await Promise.all([
      listFollowedCommunityUserIds(viewerId),
      listFollowedCommunityTopics(viewerId),
    ]);
    const userSet = new Set(userIds);
    userSet.add(viewerId);
    const topicSet = new Set(topics);
    rows = rows.filter((p) => userSet.has(p.userId) || topicSet.has(p.topic));
  }

  if (mode === 'for_you') {
    rows.sort((a, b) => {
      const rank = (r) => (r.authorRole === 'expert' || r.authorRole === 'admin' ? 0 : 1);
      const dr = rank(a) - rank(b);
      if (dr !== 0) return dr;
      return b.createdAt - a.createdAt;
    });
  }

  return rows.slice(0, cap);
}

// --- Extended (DM, announcements) ---

export async function listCommunityAnnouncementMessages({ sinceTs, limit = 80 } = {}) {
  const cap = Math.min(Math.max(limit, 1), 120);
  let q = db().collection(FS.ANNOUNCEMENTS).where('status', '==', 'published');
  if (sinceTs) q = q.where('createdAt', '>', sinceTs);
  q = q.orderBy('createdAt', 'asc').limit(cap);
  const snap = await q.get();
  return snap.docs.map((doc) => {
    const r = doc.data();
    return {
      id: doc.id,
      userId: r.userId,
      authorName: r.authorName,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.createdAt,
    };
  });
}

export async function insertCommunityAnnouncementMessage({ id, userId, content }) {
  const profile = getAuthorProfile(userId);
  const now = Date.now();
  const data = {
    userId,
    authorName: profile.name,
    authorRole: profile.role,
    content,
    status: 'published',
    createdAt: now,
  };
  await db().collection(FS.ANNOUNCEMENTS).doc(id).set(data);
  return {
    id,
    userId,
    authorName: profile.name,
    authorRole: profile.role,
    content,
    createdAt: now,
  };
}

async function mapDmThreadDoc(snap, viewerId) {
  if (!snap.exists) return null;
  const row = snap.data();
  const otherUserId = row.userA === viewerId ? row.userB : row.userA;
  const other = getAuthorProfile(otherUserId);
  const lastSnap = await db()
    .collection(FS.DM_MESSAGES)
    .where('threadId', '==', snap.id)
    .where('status', '==', 'published')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  const last = lastSnap.docs[0]?.data();
  return {
    id: snap.id,
    otherUserId,
    otherUserName: other.name,
    otherUserRole: other.role,
    lastMessage: last?.content || '',
    lastMessageAt: last?.createdAt || row.updatedAt,
    lastSenderId: last?.senderId || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getOrCreateCommunityDmThread(userId1, userId2) {
  if (userId1 === userId2) return null;
  const [userA, userB] = dmPair(userId1, userId2);
  const id = dmThreadDocId(userId1, userId2);
  const ref = db().collection(FS.DM_THREADS).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    const now = Date.now();
    await ref.set({
      userA,
      userB,
      participants: [userA, userB],
      createdAt: now,
      updatedAt: now,
    });
  }
  return mapDmThreadDoc(await ref.get(), userId1);
}

export async function listCommunityDmThreads(viewerId) {
  const snap = await db()
    .collection(FS.DM_THREADS)
    .where('participants', 'array-contains', viewerId)
    .orderBy('updatedAt', 'desc')
    .limit(80)
    .get();
  const threads = [];
  for (const doc of snap.docs) {
    const t = await mapDmThreadDoc(doc, viewerId);
    if (t) threads.push(t);
  }
  return threads;
}

export async function getCommunityDmThreadForUser(threadId, viewerId) {
  const snap = await db().collection(FS.DM_THREADS).doc(threadId).get();
  if (!snap.exists) return null;
  const row = snap.data();
  if (!row.participants?.includes(viewerId)) return null;
  return mapDmThreadDoc(snap, viewerId);
}

export async function listCommunityDmMessages(threadId, viewerId, { sinceTs, limit = 80 } = {}) {
  const thread = await getCommunityDmThreadForUser(threadId, viewerId);
  if (!thread) return null;
  const cap = Math.min(Math.max(limit, 1), 120);
  let q = db()
    .collection(FS.DM_MESSAGES)
    .where('threadId', '==', threadId)
    .where('status', '==', 'published');
  if (sinceTs) q = q.where('createdAt', '>', sinceTs);
  q = q.orderBy('createdAt', 'asc').limit(cap);
  const snap = await q.get();
  return snap.docs.map((doc) => {
    const r = doc.data();
    return {
      id: doc.id,
      threadId: r.threadId,
      senderId: r.senderId,
      authorName: r.authorName,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.createdAt,
    };
  });
}

export async function insertCommunityDmMessage({ id, threadId, senderId, content }) {
  const threadRef = db().collection(FS.DM_THREADS).doc(threadId);
  const thread = await threadRef.get();
  if (!thread.exists) return null;
  const row = thread.data();
  if (row.userA !== senderId && row.userB !== senderId) return null;

  const profile = getAuthorProfile(senderId);
  const now = Date.now();
  const data = {
    threadId,
    senderId,
    authorName: profile.name,
    authorRole: profile.role,
    content,
    status: 'published',
    createdAt: now,
  };
  await db().collection(FS.DM_MESSAGES).doc(id).set(data);
  await threadRef.update({ updatedAt: now });
  return {
    id,
    threadId,
    senderId,
    authorName: profile.name,
    authorRole: profile.role,
    content,
    createdAt: now,
  };
}

export async function searchCommunityMembers(opts) {
  return searchUsersSqlite(opts);
}

export async function listRoomMentionCandidates(topic, { query, limit = 12 } = {}) {
  const cap = Math.min(Math.max(limit, 1), 20);
  const trimmed = String(query || '').trim();
  let q = db()
    .collection(FS.ROOM_MESSAGES)
    .where('topic', '==', topic)
    .where('status', '==', 'published')
    .orderBy('createdAt', 'desc')
    .limit(60);
  const snap = await q.get();
  const byId = new Map();
  for (const doc of snap.docs) {
    const r = doc.data();
    if (trimmed && !r.authorName?.toLowerCase().includes(trimmed.toLowerCase())) continue;
    if (!byId.has(r.userId)) {
      byId.set(r.userId, { id: r.userId, name: r.authorName, role: r.authorRole });
    }
    if (byId.size >= cap) break;
  }
  const fromRoom = [...byId.values()];
  if (!trimmed || fromRoom.length >= cap) return fromRoom;
  const extras = searchUsersSqlite({ query: trimmed, excludeUserId: '', limit: cap }).filter(
    (u) => !byId.has(u.id),
  );
  return [...fromRoom, ...extras].slice(0, cap);
}
