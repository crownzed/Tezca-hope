import { useCallback, useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { EmptyState } from '../../components/tezca/EmptyState';
import { PostCard, type ForumComment, type ForumPost } from '../../components/community/PostCard';

/** Trang "Đã lưu" — danh sách bài viết người dùng đã bookmark */
export function CommunitySavedPage() {
  const { token, user } = useAnyCommunitySession();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Trạng thái bình luận (mở rộng để xem/sửa)
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, ForumComment[]>>({});
  const [threadReplies, setThreadReplies] = useState<Record<string, ForumPost[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [threadReplyDraft, setThreadReplyDraft] = useState<Record<string, string>>({});

  const loadBookmarks = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ posts: ForumPost[]; nextCursor?: string }>('/api/community/bookmarks?limit=30', {
      token,
    })
      .then((r) => {
        setPosts(r.posts);
        setNextCursor(r.nextCursor);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được bài đã lưu'))
      .finally(() => setLoading(false));
  }, [token]);

  const loadMore = useCallback(async () => {
    if (!token || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiFetch<{ posts: ForumPost[]; nextCursor?: string }>(
        `/api/community/bookmarks?limit=30&before=${nextCursor}`,
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
  }, [token, nextCursor, loadingMore]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

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

  // Bỏ lưu → xóa khỏi danh sách luôn cho trực quan
  const toggleBookmark = async (postId: string) => {
    if (!token) return;
    try {
      await apiFetch(`/api/community/posts/${encodeURIComponent(postId)}/bookmark`, {
        method: 'POST',
        token,
      });
      setPosts((list) => list.filter((p) => p.id !== postId));
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

  const toggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!comments[postId]) loadComments(postId);
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

  const editPost = async (postId: string, content: string) => {
    if (!token) return;
    try {
      const r = await apiFetch<{ post: ForumPost }>(
        `/api/community/posts/${encodeURIComponent(postId)}`,
        { method: 'PATCH', token, body: JSON.stringify({ content }) },
      );
      setPosts((list) => list.map((p) => (p.id === postId ? { ...p, ...r.post } : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không sửa được bài');
    }
  };

  const deletePost = async (postId: string) => {
    if (!token || !window.confirm('Xóa bài viết này?')) return;
    try {
      await apiFetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        token,
      });
      setPosts((list) => list.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được bài');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
          <Bookmark size={26} /> Bài đã lưu
        </h1>
        <p className="mt-2 m-0 opacity-70 text-sm" style={{ color: tezcaTheme.text }}>
          Những bài viết bạn đánh dấu để xem lại sau.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 m-0">{error}</p>}
      {loading && <p className="text-sm opacity-60">Đang tải…</p>}

      {!loading && posts.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title="Chưa lưu bài nào"
          description="Nhấn biểu tượng lưu trên bài viết để dành đọc sau."
          actionLabel="Làm mới"
          onAction={loadBookmarks}
        />
      )}

      <ul className="space-y-4 list-none m-0 p-0 max-w-[680px]">
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
            onReport={() => {}}
            onToggleBookmark={toggleBookmark}
            onEditPost={editPost}
            onDeletePost={deletePost}
            onCommentDraftChange={(postId, value) =>
              setCommentDraft((d) => ({ ...d, [postId]: value }))
            }
            onThreadReplyDraftChange={(postId, value) =>
              setThreadReplyDraft((d) => ({ ...d, [postId]: value }))
            }
            onSubmitComment={submitComment}
            onSubmitThreadReply={() => {}}
          />
        ))}
      </ul>

      {nextCursor && !loading && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full max-w-[680px] rounded-xl border py-2.5 text-sm cursor-pointer disabled:opacity-50"
          style={{ borderColor: tezcaTheme.border }}
        >
          {loadingMore ? 'Đang tải thêm…' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
