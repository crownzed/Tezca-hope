import { useCallback, useEffect, useState } from 'react';
import { Megaphone, SendHorizontal } from 'lucide-react';
import { apiFetch, canUseWebSocket } from '../../lib/api';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { roleBadgeLabel } from '../../lib/communityTopics';
import { renderCommunityMessageContent } from '../../lib/communityMessageContent';
import {
  useCommunityAnnouncementChannel,
  type AnnouncementMessage,
} from '../../hooks/useCommunityAnnouncementChannel';
import { mergeUniqueById } from '../../hooks/useCommunityRealtime';

type AnnouncementChannelProps = {
  token: string | null;
  userRole: string;
  userName: string;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnnouncementChannel({ token, userRole, userName }: AnnouncementChannelProps) {
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canPost = userRole === 'expert' || userRole === 'admin';

  const load = useCallback(() => {
    if (!token) return;
    apiFetch<{ messages: AnnouncementMessage[] }>('/api/community/announcements/messages', {
      token,
    })
      .then((r) => {
        setMessages(r.messages);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được thông báo'));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useCommunityAnnouncementChannel(token, Boolean(token), {
    onMessage: (message) => {
      setMessages((prev) => mergeUniqueById(prev, [message]));
    },
  });

  const submit = async () => {
    if (!token || !draft.trim() || !canPost) return;
    setBusy(true);
    try {
      const r = await apiFetch<{ message: AnnouncementMessage }>(
        '/api/community/announcements/messages',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ content: draft.trim() }),
        },
      );
      setDraft('');
      if (!canUseWebSocket()) load();
      else setMessages((prev) => mergeUniqueById(prev, [r.message]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng được thông báo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[720px]">
      <div>
        <h1 className="text-2xl font-bold m-0 flex items-center gap-2">
          <Megaphone size={26} />
          #thong-bao
        </h1>
        <p className="mt-2 m-0 text-sm opacity-70">
          Kênh read-only — chỉ chuyên gia và quản trị viên đăng thông báo chính thức từ Tezca.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 m-0">{error}</p>}

      <div className="rounded-2xl border min-h-[50vh] flex flex-col" style={tezcaCardStyle}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm opacity-50 text-center m-0">Chưa có thông báo nào.</p>
          )}
          {messages.map((m) => (
            <article
              key={m.id}
              className="rounded-xl px-4 py-3 border-l-4"
              style={{ borderColor: tezcaTheme.accentDark, backgroundColor: tezcaTheme.subtleBg }}
            >
              <p className="m-0 text-xs font-medium">
                {m.authorName}{' '}
                <span className="opacity-50">
                  · {roleBadgeLabel(m.authorRole)} · {formatTime(m.createdAt)}
                </span>
              </p>
              <p className="m-0 text-sm mt-2 whitespace-pre-wrap leading-relaxed">
                {renderCommunityMessageContent(m.content)}
              </p>
            </article>
          ))}
        </div>

        {canPost ? (
          <div className="border-t p-3 flex gap-2" style={{ borderColor: tezcaTheme.border }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
              placeholder="Đăng thông báo chính thức…"
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: tezcaTheme.border }}
              disabled={busy}
            />
            <button
              type="button"
              onClick={submit}
              disabled={busy || !draft.trim()}
              className="rounded-xl px-3 py-2 text-sm font-semibold border-0 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
            >
              <SendHorizontal size={16} />
              Đăng
            </button>
          </div>
        ) : (
          <p className="m-0 px-4 py-3 text-xs opacity-60 border-t" style={{ borderColor: tezcaTheme.border }}>
            Xin chào {userName}. Bạn chỉ có thể đọc kênh này — thông báo do đội ngũ Tezca đăng.
          </p>
        )}
      </div>
    </div>
  );
}
