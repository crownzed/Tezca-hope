import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bell, Heart, MessageCircle, MessageSquare, UserPlus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { EmptyState } from '../../components/tezca/EmptyState';
import { ROUTES } from '../../routes';

type CommunityNotification = {
  id: string;
  type: string;
  actorId: string | null;
  actorName: string | null;
  postId: string | null;
  commentId: string | null;
  threadId: string | null;
  preview: string | null;
  read: boolean;
  createdAt: number;
};

const TYPE_META: Record<string, { icon: typeof Bell; label: (name: string) => string }> = {
  like: { icon: Heart, label: (n) => `${n} đã thích bài viết của bạn` },
  comment: { icon: MessageCircle, label: (n) => `${n} đã bình luận bài viết của bạn` },
  reply: { icon: MessageSquare, label: (n) => `${n} đã trả lời bài viết của bạn` },
  follow: { icon: UserPlus, label: (n) => `${n} đã theo dõi bạn` },
  dm: { icon: MessageCircle, label: (n) => `${n} đã gửi tin nhắn cho bạn` },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export function CommunityNotificationsPage() {
  const { token } = useAnyCommunitySession();
  const [items, setItems] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ items: CommunityNotification[]; unread: number; nextCursor?: number }>(
      '/api/community/notifications?limit=30',
      { token },
    )
      .then((r) => {
        setItems(r.items);
        setNextCursor(r.nextCursor);
        setError('');
        // Đánh dấu đã đọc tất cả khi mở trang
        if (r.unread > 0) {
          apiFetch('/api/community/notifications/read', { method: 'POST', token, body: '{}' }).catch(
            () => {},
          );
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được thông báo'))
      .finally(() => setLoading(false));
  }, [token]);

  const loadMore = useCallback(async () => {
    if (!token || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiFetch<{ items: CommunityNotification[]; nextCursor?: number }>(
        `/api/community/notifications?limit=30&before=${nextCursor}`,
        { token },
      );
      setItems((list) => {
        const seen = new Set(list.map((n) => n.id));
        return [...list, ...r.items.filter((n) => !seen.has(n.id))];
      });
      setNextCursor(r.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải thêm được');
    } finally {
      setLoadingMore(false);
    }
  }, [token, nextCursor, loadingMore]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-[680px]">
      <div>
        <h1
          className="text-2xl md:text-3xl font-bold m-0 flex items-center gap-2"
          style={{ color: tezcaTheme.text }}
        >
          <Bell size={26} /> Thông báo của tôi
        </h1>
        <p className="mt-2 m-0 opacity-70 text-sm" style={{ color: tezcaTheme.text }}>
          Hoạt động liên quan đến bạn trong cộng đồng.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 m-0">{error}</p>}
      {loading && <p className="text-sm opacity-60">Đang tải…</p>}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={Bell}
          title="Chưa có thông báo"
          description="Khi có người tương tác với bạn, thông báo sẽ hiện ở đây."
          actionLabel="Làm mới"
          onAction={load}
        />
      )}

      <ul className="space-y-2 list-none m-0 p-0">
        {items.map((n) => {
          const meta = TYPE_META[n.type] || { icon: Bell, label: () => 'Thông báo mới' };
          const Icon = meta.icon;
          const name = n.actorName || 'Ai đó';
          const target = n.postId
            ? `${ROUTES.community.forum}?post=${n.postId}`
            : ROUTES.community.forum;
          return (
            <li key={n.id}>
              <Link
                to={target}
                className="flex items-start gap-3 rounded-xl px-4 py-3 no-underline"
                style={{
                  backgroundColor: n.read ? 'transparent' : 'rgba(99,102,241,0.08)',
                  border: `1px solid ${tezcaTheme.border}`,
                  color: tezcaTheme.text,
                }}
              >
                <span
                  className="inline-flex w-9 h-9 rounded-full items-center justify-center shrink-0"
                  style={{ backgroundColor: tezcaTheme.subtleBg, color: tezcaTheme.accentDark }}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{meta.label(name)}</span>
                  {n.preview && (
                    <span className="block text-xs opacity-60 truncate mt-0.5">{n.preview}</span>
                  )}
                  <span className="block text-xs opacity-40 mt-0.5">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 mt-2"
                    style={{ backgroundColor: tezcaTheme.accentDark }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

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
