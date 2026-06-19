import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { Search, User } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { roleBadgeLabel } from '../../lib/communityTopics';
import { PostCard, type ForumComment, type ForumPost } from '../../components/community/PostCard';

type Member = { id: string; name: string; role: string };

export function CommunitySearchPage() {
  const { token, user } = useAnyCommunitySession();
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [nextCursor, setNextCursor] = useState<number | undefined>();
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Trạng thái bình luận cho kết quả
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, ForumComment[]>>({});
  const [threadReplies, setThreadReplies] = useState<Record<string, ForumPost[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [threadReplyDraft, setThreadReplyDraft] = useState<Record<string, string>>({});

  const runSearch = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const q = query.trim();
      if (!token || !q) return;
      setLoading(true);
      setSearched(true);
      try {
        const r = await apiFetch<{ posts: ForumPost[]; members: Member[]; nextCursor?: number }>(
          `/api/community/search?q=${encodeURIComponent(q)}&limit=30`,
          { token },
        );
        setPosts(r.posts);
        setMembers(r.members || []);
        setNextCursor(r.nextCursor);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tìm kiếm thất bại');
      } finally {
        setLoading(false);
      }
    },
    [token, query],
  );

  const loadMore = useCallback(async () => {
    if (!token || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiFetch<{ posts: ForumPost[]; nextCursor?: number }>(
        `/api/community/search?q=${encodeURIComponent(query.trim())}&limit=30&before=${nextCursor}`,
        { token },
      );
      setPosts((list) => {
        const seen = new Set(list.map((p) => p.id));
        return [...list, ...r.posts.filter((p) => !seen.has(p.id))];
      });
      setNextCursor(r.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải thêm được');
    } finally {
      setLoadingMore(false);
    }
  }, [token, nextCursor, loadingMore, query]);

  const toggleLike = async (postId: string) => {
    if (!token) return;
    try {
      const r = await apiFetch<{ liked: boolean; likesCount: number }>(
        `/api/community/posts/${encodeURIComponent(postId)}/like`,
        { method: 'POST', token },
      );
      setPosts((list) =>
        list.map((p) => (p.id === postId ? { ...p, likedByMe: r.liked, likesCount: r.likesCount } : p)),
      );
    } catch {
      /* ignore */
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!token) return;
    try {
      const r = await apiFetch<{ bookmarked: boolean }>(
        `/api/community/posts/${encodeURIComponent(postId)}/bookmark`,
        { method: 'POST', token },
      );
      setPosts((list) =>
        list.map((p) => (p.id === postId ? { ...p, bookmarkedByMe: r.bookmarked } : p)),
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
  };

  const reportPost = async (postId: string) => {
    if (!token || !window.confirm('Báo cáo bài viết này?')) return;
    await apiFetch(`/api/community/posts/${encodeURIComponent(postId)}/report`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason: 'Nội dung không phù hợp' }),
    });
    alert('Đã gửi báo cáo.');
  };

  return (
    <div className="space-y-6 max-w-[680px]">
      <div>
        <h1
          className="text-2xl md:text-3xl font-bold m-0 flex items-center gap-2"
          style={{ color: tezcaTheme.text }}
        >
          <Search size={26} /> Tìm kiếm
        </h1>
        <p className="mt-2 m-0 opacity-70 text-sm" style={{ color: tezcaTheme.text }}>
          Tìm bài viết, từ khóa hoặc #hashtag và thành viên.
        </p>
      </div>

      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập từ khóa hoặc #hashtag…"
          className="flex-1 rounded-xl border px-4 py-2.5 text-sm"
          style={{ borderColor: tezcaTheme.border }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer border-0 disabled:opacity-50"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          Tìm
        </button>
      </form>

      {error && <p className="text-sm text-red-600 m-0">{error}</p>}
      {loading && <p className="text-sm opacity-60">Đang tìm…</p>}

      {members.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold m-0 opacity-70">Thành viên</h2>
          <ul className="space-y-1 list-none m-0 p-0">
            {members.map((m) => (
              <li key={m.id}>
                <div
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{ border: `1px solid ${tezcaTheme.border}` }}
                >
                  <span
                    className="inline-flex w-8 h-8 rounded-full items-center justify-center shrink-0"
                    style={{ backgroundColor: tezcaTheme.subtleBg, color: tezcaTheme.accentDark }}
                  >
                    <User size={16} />
                  </span>
                  <span className="text-sm">
                    {m.name} <span className="opacity-50">· {roleBadgeLabel(m.role)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {searched && !loading && posts.length === 0 && members.length === 0 && (
        <p className="text-sm opacity-60">Không tìm thấy kết quả nào.</p>
      )}

      {posts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold m-0 opacity-70">Bài viết</h2>
          <ul className="space-y-4 list-none m-0 p-0">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                expanded={expandedPost === post.id}
                comments={comments[post.id] || []}
                threadReplies={threadReplies[post.id] || []}
                commentDraft={commentDraft[post.id] || ''}
                threadReplyDraft={threadReplyDraft[post.id] || ''}
                onToggleLike={toggleLike}
                onToggleComments={toggleComments}
                onReport={reportPost}
                onToggleBookmark={toggleBookmark}
                onCommentDraftChange={(postId, value) =>
                  setCommentDraft((d) => ({ ...d, [postId]: value }))
                }
                onThreadReplyDraftChange={(postId, value) =>
                  setThreadReplyDraft((d) => ({ ...d, [postId]: value }))
                }
                onSubmitComment={submitComment}
                onSubmitThreadReply={submitThreadReply}
              />
            ))}
          </ul>
        </div>
      )}

      {nextCursor && !loading && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full rounded-xl border py-2.5 text-sm cursor-pointer disabled:opacity-50"
          style={{ borderColor: tezcaTheme.border }}
        >
          {loadingMore ? 'Đang tải thêm…' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
