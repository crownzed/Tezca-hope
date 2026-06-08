import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Search, SendHorizontal } from 'lucide-react';
import { apiFetch, canUseWebSocket } from '../../lib/api';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { roleBadgeLabel } from '../../lib/communityTopics';
import { ChatMentionInput, type MentionCandidate } from './ChatMentionInput';
import { renderCommunityMessageContent } from '../../lib/communityMessageContent';
import { useCommunityDmChannel, type DmMessage } from '../../hooks/useCommunityDmChannel';
import { mergeUniqueById } from '../../hooks/useCommunityRealtime';

export type DmThread = {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderId: string | null;
};

type DirectMessagesPanelProps = {
  token: string | null;
  currentUserId: string;
  currentUserName: string;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DirectMessagesPanel({
  token,
  currentUserId,
  currentUserName,
}: DirectMessagesPanelProps) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<MentionCandidate[]>([]);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const loadThreads = useCallback(() => {
    if (!token) return;
    apiFetch<{ threads: DmThread[] }>('/api/community/dm/threads', { token })
      .then((r) => setThreads(r.threads))
      .catch(() => {});
  }, [token]);

  const loadMessages = useCallback(
    (threadId: string) => {
      if (!token) return;
      apiFetch<{ messages: DmMessage[] }>(
        `/api/community/dm/threads/${encodeURIComponent(threadId)}/messages`,
        { token },
      )
        .then((r) => setMessages(r.messages))
        .catch((err) => setError(err instanceof Error ? err.message : 'Không tải tin nhắn'));
    },
    [token],
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { typingText, sendTyping } = useCommunityDmChannel(token, activeThreadId, Boolean(activeThreadId), {
    onMessage: (message) => {
      setMessages((prev) => mergeUniqueById(prev, [message]));
      setThreads((list) =>
        list.map((t) =>
          t.id === message.threadId
            ? {
                ...t,
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
                lastSenderId: message.senderId,
              }
            : t,
        ),
      );
    },
  });

  useEffect(() => {
    if (!token || !memberQuery.trim()) {
      setMemberResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      apiFetch<{ members: MentionCandidate[] }>(
        `/api/community/dm/members?q=${encodeURIComponent(memberQuery.trim())}`,
        { token },
      )
        .then((r) => setMemberResults(r.members))
        .catch(() => setMemberResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, memberQuery]);

  const openThreadWith = async (otherUserId: string) => {
    if (!token) return;
    const r = await apiFetch<{ thread: DmThread }>('/api/community/dm/threads', {
      method: 'POST',
      token,
      body: JSON.stringify({ otherUserId }),
    });
    setThreads((list) => {
      if (list.some((t) => t.id === r.thread.id)) return list;
      return [r.thread, ...list];
    });
    setActiveThreadId(r.thread.id);
    setMemberQuery('');
    setMemberResults([]);
  };

  const sendMessage = async () => {
    if (!token || !activeThreadId || !draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    const r = await apiFetch<{ message: DmMessage }>(
      `/api/community/dm/threads/${encodeURIComponent(activeThreadId)}/messages`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ content: text }),
      },
    );
    if (!canUseWebSocket()) loadMessages(activeThreadId);
    else {
      setMessages((prev) => mergeUniqueById(prev, [r.message]));
      setThreads((list) =>
        list.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                lastMessage: text,
                lastMessageAt: r.message.createdAt,
                lastSenderId: currentUserId,
              }
            : t,
        ),
      );
    }
  };

  const fetchDmMentionCandidates = useCallback(
    async (query: string) => {
      if (!token) return [];
      const q = query.trim();
      const r = await apiFetch<{ members: MentionCandidate[] }>(
        `/api/community/dm/members?q=${encodeURIComponent(q)}`,
        { token },
      );
      return r.members.filter((m) => m.id !== currentUserId);
    },
    [token, currentUserId],
  );

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (value.trim()) sendTyping();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold m-0 flex items-center gap-2">
          <MessageCircle size={26} />
          Tin nhắn riêng
        </h1>
        <p className="mt-2 m-0 text-sm opacity-70">
          Trò chuyện 1-1 với thành viên cộng đồng (không thay thế chat chuyên gia trong ứng dụng sức khỏe).
        </p>
      </div>

      {error && <p className="text-sm text-red-600 m-0">{error}</p>}

      <div className="rounded-2xl border overflow-hidden min-h-[68vh]" style={tezcaCardStyle}>
        <div className="grid md:grid-cols-[280px_minmax(0,1fr)] min-h-[68vh]">
          <aside className="border-b md:border-b-0 md:border-r p-3 flex flex-col min-h-0" style={{ borderColor: tezcaTheme.border }}>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Tìm thành viên để nhắn…"
                className="w-full rounded-xl border pl-9 pr-3 py-2 text-sm"
                style={{ borderColor: tezcaTheme.border }}
              />
            </div>
            {memberResults.length > 0 && (
              <ul className="list-none m-0 p-0 mb-3 space-y-1 max-h-32 overflow-y-auto">
                {memberResults.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openThreadWith(m.id)}
                      className="w-full text-left rounded-lg px-2 py-1.5 border-0 cursor-pointer text-sm"
                      style={{ backgroundColor: tezcaTheme.subtleBg }}
                    >
                      {m.name}
                      <span className="opacity-50 text-xs ml-1">{roleBadgeLabel(m.role)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="m-0 text-xs uppercase tracking-wide opacity-60">Cuộc trò chuyện</p>
            <div className="mt-2 flex-1 overflow-y-auto space-y-1">
              {threads.length === 0 && (
                <p className="text-xs opacity-50 m-0">Chưa có tin nhắn riêng.</p>
              )}
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveThreadId(t.id)}
                  className="w-full text-left rounded-lg px-3 py-2 border-0 cursor-pointer"
                  style={
                    activeThreadId === t.id
                      ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                      : { backgroundColor: tezcaTheme.subtleBg, color: tezcaTheme.textMuted }
                  }
                >
                  <p className="m-0 text-sm font-semibold">{t.otherUserName}</p>
                  <p className="m-0 text-xs opacity-75 line-clamp-1 mt-0.5">
                    {t.lastMessage || 'Bắt đầu trò chuyện'}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col min-h-0">
            {!activeThread ? (
              <p className="m-auto text-sm opacity-50 p-8 text-center">
                Chọn cuộc trò chuyện hoặc tìm thành viên để bắt đầu nhắn tin.
              </p>
            ) : (
              <>
                <header className="px-4 py-3 border-b" style={{ borderColor: tezcaTheme.border }}>
                  <p className="m-0 font-semibold text-sm">{activeThread.otherUserName}</p>
                  <p className="m-0 text-xs opacity-60">{roleBadgeLabel(activeThread.otherUserRole)}</p>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.map((m) => {
                    const mine = m.senderId === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${mine ? 'ml-auto' : ''}`}
                        style={{
                          backgroundColor: mine ? tezcaTheme.accentLight : tezcaTheme.subtleBg,
                          color: tezcaTheme.text,
                        }}
                      >
                        {!mine && (
                          <p className="m-0 text-xs font-medium opacity-70">{m.authorName}</p>
                        )}
                        <p className="m-0 whitespace-pre-wrap mt-0.5">
                          {renderCommunityMessageContent(m.content)}
                        </p>
                        <p className="m-0 text-[10px] opacity-50 mt-1">{formatTime(m.createdAt)}</p>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                {typingText && (
                  <p className="m-0 px-4 text-xs opacity-60 animate-pulse">{typingText}</p>
                )}
                <div className="border-t p-3 flex gap-2" style={{ borderColor: tezcaTheme.border }}>
                  <ChatMentionInput
                    value={draft}
                    onChange={handleDraftChange}
                    onSend={sendMessage}
                    fetchCandidates={fetchDmMentionCandidates}
                    placeholder={`Nhắn ${activeThread.otherUserName}…`}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    className="rounded-xl px-3 py-2 border-0 cursor-pointer shrink-0"
                    style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
                    aria-label="Gửi"
                  >
                    <SendHorizontal size={18} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      <p className="text-xs opacity-50 m-0">
        Không chia sẻ thông tin y tế nhạy cảm qua DM công đồng. Cần tư vấn riêng → chat chuyên gia trong ứng dụng.
      </p>
    </div>
  );
}
