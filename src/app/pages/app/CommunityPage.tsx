import { useCallback, useEffect, useState } from 'react';
import { apiFetch, canUseWebSocket } from '../../lib/api';
import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import type { CommunityFeedMode } from '../../lib/communityFeed';
import {
  POST_TOPICS,
  ROOM_TOPICS,
  type CommunityPostTopic,
  type CommunityRoomTopic,
} from '../../lib/communityTopics';
import { CommunityRightAside } from '../../components/community/CommunityRightAside';
import { ForumFeed } from '../../components/community/ForumFeed';
import type { ForumComment, ForumPost } from '../../components/community/PostCard';
import { GroupChatBox, type RoomChatMessage } from '../../components/community/GroupChatBox';
import {
  mergeUniqueById,
  useCommunityForumRealtime,
  useCommunityRoomPoll,
} from '../../hooks/useCommunityRealtime';
import { useCommunityRoomChannel } from '../../hooks/useCommunityRoomChannel';

type CommunityPageProps = {
  mode: 'forum' | 'rooms';
};

const ROOM_READ_STORAGE_KEY = 'tezca_community_room_read_v1';

function defaultRoomState() {
  return ROOM_TOPICS.reduce(
    (acc, room) => {
      acc[room.id] = 0;
      return acc;
    },
    {} as Record<CommunityRoomTopic, number>,
  );
}

function loadRoomReadState(): Record<CommunityRoomTopic, number> {
  const fallback = defaultRoomState();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(ROOM_READ_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<CommunityRoomTopic, number>>;
    return {
      nutrition: Number(parsed.nutrition || 0),
      psychology: Number(parsed.psychology || 0),
      musculoskeletal: Number(parsed.musculoskeletal || 0),
    };
  } catch {
    return fallback;
  }
}

export function CommunityPage({ mode }: CommunityPageProps) {
  const { token, user } = useAnyCommunitySession();
  const tab = mode;
  const [feedMode, setFeedMode] = useState<CommunityFeedMode>('for_you');
  const [topicFilter, setTopicFilter] = useState<CommunityPostTopic | ''>('');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followedTopics, setFollowedTopics] = useState<Set<CommunityPostTopic>>(new Set());
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [newPost, setNewPost] = useState({
    topic: 'general' as CommunityPostTopic,
    content: '',
    imageUrl: '',
  });
  const [postBusy, setPostBusy] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, ForumComment[]>>({});
  const [threadReplies, setThreadReplies] = useState<Record<string, ForumPost[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [threadReplyDraft, setThreadReplyDraft] = useState<Record<string, string>>({});

  const [roomTopic, setRoomTopic] = useState<CommunityRoomTopic>('nutrition');
  const [roomMessages, setRoomMessages] = useState<RoomChatMessage[]>([]);
  const [roomDraft, setRoomDraft] = useState('');
  const [roomLatestByTopic, setRoomLatestByTopic] = useState<Record<CommunityRoomTopic, number>>(
    defaultRoomState,
  );
  const [roomReadAtByTopic, setRoomReadAtByTopic] =
    useState<Record<CommunityRoomTopic, number>>(loadRoomReadState);

  const loadPosts = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ mode: feedMode, limit: '30' });
    if (topicFilter) params.set('topic', topicFilter);
    apiFetch<{ posts: ForumPost[]; nextCursor?: string }>(
      `/api/community/feed?${params.toString()}`,
      { token },
    )
      .then((r) => {
        setPosts(r.posts);
        setNextCursor(r.nextCursor);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được bài viết'))
      .finally(() => setLoading(false));
  }, [token, topicFilter, feedMode]);

  const loadMorePosts = useCallback(async () => {
    if (!token || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ mode: feedMode, limit: '30', before: nextCursor });
    if (topicFilter) params.set('topic', topicFilter);
    try {
      const r = await apiFetch<{ posts: ForumPost[]; nextCursor?: string }>(
        `/api/community/feed?${params.toString()}`,
        { token },
      );
      setPosts((list) => {
        const seen = new Set(list.map((p) => p.id));
        const merged = [...list, ...r.posts.filter((p) => !seen.has(p.id))];
        return merged;
      });
      setNextCursor(r.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải thêm được bài viết');
    } finally {
      setLoadingMore(false);
    }
  }, [token, topicFilter, feedMode, nextCursor, loadingMore]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!token || tab !== 'forum') return;
    apiFetch<{ topics: CommunityPostTopic[] }>('/api/community/topics/following', { token })
      .then((r) => setFollowedTopics(new Set(r.topics)))
      .catch(() => {});
    apiFetch<{ userIds: string[] }>('/api/community/users/following', { token })
      .then((r) => setFollowedUserIds(new Set(r.userIds)))
      .catch(() => {});
  }, [token, tab]);

  useCommunityForumRealtime(token, tab === 'forum', {
    onPost: (post) => {
      const p = post as ForumPost;
      if (p.parentPostId) {
        setThreadReplies((tr) => {
          const list = tr[p.parentPostId!] || [];
          if (list.some((r) => r.id === p.id)) return tr;
          return { ...tr, [p.parentPostId!]: [...list, p] };
        });
        setPosts((list) =>
          list.map((row) =>
            row.id === p.parentPostId
              ? { ...row, threadReplyCount: (row.threadReplyCount || 0) + 1 }
              : row,
          ),
        );
        return;
      }
      if (topicFilter && p.topic !== topicFilter) return;
      setPosts((list) => {
        if (list.some((row) => row.id === p.id)) return list;
        return [p, ...list];
      });
    },
    onPostRemoved: (postId) => {
      setPosts((list) => list.filter((p) => p.id !== postId));
    },
    onComment: (postId) => {
      setPosts((list) =>
        list.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)),
      );
    },
  });

  const submitPost = async () => {
    if (!token || !newPost.content.trim()) return;
    setPostBusy(true);
    try {
      const r = await apiFetch<{ post: ForumPost }>('/api/community/posts', {
        method: 'POST',
        token,
        body: JSON.stringify({
          topic: newPost.topic,
          content: newPost.content.trim(),
          imageUrl: newPost.imageUrl.trim(),
        }),
      });
      setNewPost((s) => ({ ...s, content: '', imageUrl: '' }));
      if (!canUseWebSocket()) loadPosts();
      else if (r.post) {
        setPosts((list) => {
          if (list.some((p) => p.id === r.post.id)) return list;
          return [r.post, ...list];
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng được bài');
    } finally {
      setPostBusy(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!token) return;
    try {
      const r = await apiFetch<{ liked: boolean; likesCount: number }>(
        `/api/community/posts/${encodeURIComponent(postId)}/like`,
        { method: 'POST', token },
      );
      setPosts((list) =>
        list.map((p) =>
          p.id === postId ? { ...p, likedByMe: r.liked, likesCount: r.likesCount } : p,
        ),
      );
    } catch {
      /* ignore */
    }
  };

  const loadComments = async (postId: string) => {
    if (!token) return;
    const r = await apiFetch<{ comments: ForumComment[] }>(
      `/api/community/posts/${encodeURIComponent(postId)}/comments`,
      { token },
    );
    setComments((c) => ({ ...c, [postId]: r.comments }));
  };

  const loadThreadReplies = async (postId: string) => {
    if (!token) return;
    const r = await apiFetch<{ replies: ForumPost[] }>(
      `/api/community/posts/${encodeURIComponent(postId)}/replies`,
      { token },
    );
    setThreadReplies((tr) => ({ ...tr, [postId]: r.replies }));
  };

  const toggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!comments[postId]) loadComments(postId);
    if (!threadReplies[postId]) loadThreadReplies(postId);
  };

  const toggleFollowAuthor = async (userId: string) => {
    if (!token || userId === user?.id) return;
    const following = followedUserIds.has(userId);
    try {
      await apiFetch(`/api/community/users/${encodeURIComponent(userId)}/follow`, {
        method: following ? 'DELETE' : 'POST',
        token,
      });
      setFollowedUserIds((prev) => {
        const next = new Set(prev);
        if (following) next.delete(userId);
        else next.add(userId);
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const toggleTopicFollow = async (topic: CommunityPostTopic) => {
    if (!token) return;
    const following = followedTopics.has(topic);
    try {
      await apiFetch(`/api/community/topics/${encodeURIComponent(topic)}/follow`, {
        method: following ? 'DELETE' : 'POST',
        token,
      });
      setFollowedTopics((prev) => {
        const next = new Set(prev);
        if (following) next.delete(topic);
        else next.add(topic);
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const submitThreadReply = async (postId: string) => {
    if (!token) return;
    const text = (threadReplyDraft[postId] || '').trim();
    if (!text) return;
    const r = await apiFetch<{ post: ForumPost }>(
      `/api/community/posts/${encodeURIComponent(postId)}/reply`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ content: text }),
      },
    );
    setThreadReplyDraft((d) => ({ ...d, [postId]: '' }));
    setThreadReplies((tr) => ({
      ...tr,
      [postId]: [...(tr[postId] || []), r.post],
    }));
    if (!canUseWebSocket()) {
      setPosts((list) =>
        list.map((p) =>
          p.id === postId ? { ...p, threadReplyCount: (p.threadReplyCount || 0) + 1 } : p,
        ),
      );
    }
  };

  const submitComment = async (postId: string) => {
    if (!token) return;
    const text = (commentDraft[postId] || '').trim();
    if (!text) return;
    await apiFetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      token,
      body: JSON.stringify({ content: text }),
    });
    setCommentDraft((d) => ({ ...d, [postId]: '' }));
    await loadComments(postId);
    if (!canUseWebSocket()) {
      setPosts((list) =>
        list.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)),
      );
    }
  };

  const reportPost = async (postId: string) => {
    if (!token || !window.confirm('Báo cáo bài viết này cho quản trị viên?')) return;
    await apiFetch(`/api/community/posts/${encodeURIComponent(postId)}/report`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason: 'Nội dung không phù hợp' }),
    });
    alert('Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng an toàn.');
  };

  const markRoomAsRead = useCallback((topic: CommunityRoomTopic, ts: number) => {
    if (!ts) return;
    setRoomReadAtByTopic((prev) => {
      if ((prev[topic] || 0) >= ts) return prev;
      const next = { ...prev, [topic]: ts };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ROOM_READ_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const loadRoom = useCallback(() => {
    if (!token) return;
    apiFetch<{ messages: RoomChatMessage[] }>(
      `/api/community/rooms/${encodeURIComponent(roomTopic)}/messages`,
      { token },
    )
      .then((r) => {
        setRoomMessages(r.messages);
        const latest = r.messages[r.messages.length - 1]?.createdAt || 0;
        setRoomLatestByTopic((prev) => ({ ...prev, [roomTopic]: Math.max(prev[roomTopic] || 0, latest) }));
      })
      .catch(() => {});
  }, [token, roomTopic]);

  const loadRoomSnapshots = useCallback(() => {
    if (!token) return;
    Promise.all(
      ROOM_TOPICS.map(async (room) => {
        try {
          const r = await apiFetch<{ messages: RoomChatMessage[] }>(
            `/api/community/rooms/${encodeURIComponent(room.id)}/messages`,
            { token },
          );
          return { topic: room.id, latest: r.messages[r.messages.length - 1]?.createdAt || 0 };
        } catch {
          return { topic: room.id, latest: 0 };
        }
      }),
    ).then((results) => {
      setRoomLatestByTopic((prev) => {
        const next = { ...prev };
        for (const row of results) {
          next[row.topic] = Math.max(next[row.topic] || 0, row.latest);
        }
        return next;
      });
    });
  }, [token]);

  useEffect(() => {
    if (tab !== 'rooms') return;
    loadRoom();
    loadRoomSnapshots();
  }, [tab, loadRoom, loadRoomSnapshots]);

  useCommunityRoomPoll(loadRoom, tab === 'rooms' && !canUseWebSocket());
  useCommunityRoomPoll(loadRoomSnapshots, tab === 'rooms', 15000);

  const { onlineMembers, typingText, sendTyping } = useCommunityRoomChannel(
    token,
    roomTopic,
    tab === 'rooms',
    {
      onMessage: (message) => {
        setRoomMessages((prev) => mergeUniqueById(prev, [message]));
        setRoomLatestByTopic((prev) => ({
          ...prev,
          [roomTopic]: Math.max(prev[roomTopic] || 0, message.createdAt || 0),
        }));
      },
    },
  );

  const handleRoomDraftChange = (value: string) => {
    setRoomDraft(value);
    if (value.trim()) sendTyping();
  };

  const fetchRoomMentionCandidates = useCallback(
    async (query: string) => {
      if (!token) return [];
      const r = await apiFetch<{ members: { id: string; name: string; role: string }[] }>(
        `/api/community/rooms/${encodeURIComponent(roomTopic)}/mention-candidates?q=${encodeURIComponent(query)}`,
        { token },
      );
      return r.members;
    },
    [token, roomTopic],
  );

  useEffect(() => {
    if (tab !== 'rooms') return;
    const latest = roomMessages[roomMessages.length - 1]?.createdAt || 0;
    if (!latest) return;
    markRoomAsRead(roomTopic, latest);
  }, [tab, roomMessages, roomTopic, markRoomAsRead]);

  const sendRoomMessage = async () => {
    if (!token || !roomDraft.trim()) return;
    const text = roomDraft.trim();
    setRoomDraft('');
    const r = await apiFetch<{ message: RoomChatMessage }>(
      `/api/community/rooms/${encodeURIComponent(roomTopic)}/messages`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ content: text }),
      },
    );
    if (!canUseWebSocket()) loadRoom();
    else if (r.message) {
      setRoomMessages((prev) => mergeUniqueById(prev, [r.message]));
      setRoomLatestByTopic((prev) => ({
        ...prev,
        [roomTopic]: Math.max(prev[roomTopic] || 0, r.message.createdAt || 0),
      }));
      markRoomAsRead(roomTopic, r.message.createdAt || Date.now());
    }
  };

  const roomUnreadByTopic = ROOM_TOPICS.reduce(
    (acc, room) => {
      acc[room.id] = (roomLatestByTopic[room.id] || 0) > (roomReadAtByTopic[room.id] || 0);
      return acc;
    },
    {} as Record<CommunityRoomTopic, boolean>,
  );

  const topicStat = POST_TOPICS.map((topic) => ({
    id: topic.id,
    label: topic.label,
    count: posts.filter((post) => post.topic === topic.id).length,
  })).sort((a, b) => b.count - a.count);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold m-0" style={{ color: tezcaTheme.text }}>
          {tab === 'forum' ? 'Bảng tin cộng đồng' : 'Phòng chat theo chủ đề'}
        </h1>
        <p className="mt-2 m-0 opacity-70 text-sm leading-relaxed" style={{ color: tezcaTheme.text }}>
          {tab === 'forum'
            ? 'Feed kiểu Threads — đăng bài ngắn, theo dõi chủ đề và tương tác với cộng đồng sức khỏe.'
            : 'Trò chuyện thời gian thực theo chủ đề dinh dưỡng, tâm lý và cơ · xương · khớp (Discord-lite).'}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 m-0">{error}</p>}

      {tab === 'forum' && (
        <div className="flex gap-6 items-start justify-center xl:justify-start">
          <div className="flex-1 min-w-0 max-w-[680px] space-y-4">
            <ForumFeed
              authorName={user?.name || 'Bạn'}
              feedMode={feedMode}
              onFeedModeChange={setFeedMode}
              posts={posts}
              loading={loading}
              topicFilter={topicFilter}
              newPostTopic={newPost.topic}
              newPostContent={newPost.content}
              newPostImageUrl={newPost.imageUrl}
              postBusy={postBusy}
              expandedPost={expandedPost}
              comments={comments}
              commentDraft={commentDraft}
              onTopicFilterChange={setTopicFilter}
              onNewPostTopicChange={(topic) => setNewPost((s) => ({ ...s, topic }))}
              onNewPostContentChange={(content) => setNewPost((s) => ({ ...s, content }))}
              onNewPostImageUrlChange={(imageUrl) => setNewPost((s) => ({ ...s, imageUrl }))}
              onSubmitPost={submitPost}
              onRefresh={loadPosts}
              onToggleLike={toggleLike}
              onToggleComments={toggleComments}
              onReport={reportPost}
              onCommentDraftChange={(postId, value) =>
                setCommentDraft((d) => ({ ...d, [postId]: value }))
              }
              threadReplies={threadReplies}
              threadReplyDraft={threadReplyDraft}
              followedTopics={followedTopics}
              followedUserIds={followedUserIds}
              currentUserId={user?.id}
              hasMore={Boolean(nextCursor)}
              loadingMore={loadingMore}
              onToggleTopicFollow={toggleTopicFollow}
              onToggleFollowAuthor={toggleFollowAuthor}
              onLoadMore={loadMorePosts}
              onThreadReplyDraftChange={(postId, value) =>
                setThreadReplyDraft((d) => ({ ...d, [postId]: value }))
              }
              onSubmitComment={submitComment}
              onSubmitThreadReply={submitThreadReply}
            />
          </div>
          <CommunityRightAside
            posts={posts}
            topicStat={topicStat}
            onTopicSelect={(id) => setTopicFilter(id)}
          />
        </div>
      )}

      {tab === 'rooms' && (
        <div>
          <GroupChatBox
            currentUserName={user?.name || 'Bạn'}
            roomTopic={roomTopic}
            messages={roomMessages}
            draft={roomDraft}
            unreadByTopic={roomUnreadByTopic}
            onlineMembers={onlineMembers}
            typingText={typingText}
            onRoomTopicChange={setRoomTopic}
            onDraftChange={handleRoomDraftChange}
            onSend={sendRoomMessage}
            fetchMentionCandidates={fetchRoomMentionCandidates}
          />
        </div>
      )}
    </div>
  );
}
