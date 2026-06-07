import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Search, SendHorizontal, UserCircle2 } from 'lucide-react';
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

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DirectMessagesPanel({
  token,
  currentUserId,
  currentUserName,
}: DirectMessagesPanelProps) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<MentionCandidate[]>([]);
  const [error, setError] = useState('');
  const [readThreadIds, setReadThreadIds] = useState<Set<string>>(new Set());
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
      setMessagesLoading(true);
      apiFetch<{ messages: DmMessage[] }>(
        `/api/community/dm/threads/${encodeURIComponent(threadId)}/messages`,
        { token },
      )
        .then((r) => setMessages(r.messages))
        .catch((err) => setError(err instanceof Error ? err.message : 'Không tải tin nhắn'))
        .finally(() => setMessagesLoading(false));
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
    setReadThreadIds((prev) => new Set([...prev, activeThreadId]));
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { typingText, sendTyping } = useCommunityDmChannel(token, activeThreadId, Boolean(activeThreadId), {
    onMessage: (message) => {
      setMessages((prev) => mergeUniqueById(prev, [message]));
      setThreads((prev) => {
        const updated = prev.map((t) =>
          t.id === message.threadId
            ? {
                ...t,
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
                lastSenderId: message.senderId,
              }
            : t,
        );
        return updated.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      });
      if (message.threadId === activeThreadId) {
        setReadThreadIds((prev) => new Set([...prev, message.threadId]));
      }
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
            <p className="m-0 text-xs uppercase tracking-wide opacity-60 flex items-center gap-1">
              <MessageCircle size={11} />
              Cuộc trò chuyện
            </p>
            <div className="mt-2 flex-1 overflow-y-auto space-y-1 min-h-0">
              {threads.length === 0 && (
                <div className="py-6 text-center">
                  <UserCircle2 size={28} className="mx-auto mb-2 opacity-25" />
                  <p className="text-xs opacity-50 m-0">Chưa có tin nhắn riêng.</p>
                  <p className="text-xs opacity-40 m-0 mt-1">Tìm thành viên để bắt đầu.</p>
                </div>
              )}
              {threads.map((t) => {
                const isActive = activeThreadId === t.id;
                const hasUnread = !isActive && !readThreadIds.has(t.id) && t.lastSenderId && t.lastSenderId !== currentUserId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveThreadId(t.id)}
                    className="w-full text-left rounded-xl px-2.5 py-2.5 border-0 cursor-pointer transition-all flex items-center gap-2.5"
                    style={
                      isActive
                        ? { backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.text }
                        : { backgroundColor: hasUnread ? 'rgba(45, 212, 191, 0.06)' : tezcaTheme.subtleBg, color: tezcaTheme.textMuted }
                    }
                  >
                    <div
                      className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isActive ? tezcaTheme.accentGradient : 'rgba(45, 212, 191, 0.18)',
                        color: isActive ? '#fff' : tezcaTheme.accentDark,
                      }}
                    >
                      {nameInitials(t.otherUserName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`m-0 text-sm truncate ${hasUnread ? 'font-bold' : 'font-semibold'}`} style={{ color: tezcaTheme.text }}>
                          {t.otherUserName}
                        </p>
                        {t.lastMessageAt ? (
                          <span className="text-[10px] shrink-0 opacity-50">{relativeTime(t.lastMessageAt)}</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className={`m-0 text-xs line-clamp-1 flex-1 ${hasUnread ? 'font-medium opacity-90' : 'opacity-60'}`} style={{ color: tezcaTheme.text }}>
                          {t.lastMessage || 'Bắt đầu trò chuyện'}
                        </p>
                        {hasUnread && (
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: tezcaTheme.accentDark }}
                            aria-label="Tin chưa đọc"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex flex-col min-h-0">
            {!activeThread ? (
              <div className="m-auto flex flex-col items-center gap-3 px-8 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(45, 212, 191, 0.12)', color: tezcaTheme.accentDark }}
                >
                  <MessageCircle size={28} />
                </div>
                <p className="text-sm font-medium m-0" style={{ color: tezcaTheme.text }}>Chưa chọn cuộc trò chuyện</p>
                <p className="text-xs opacity-50 m-0 max-w-[220px] leading-relaxed">
                  Chọn từ danh sách hoặc tìm thành viên mới để bắt đầu nhắn tin.
                </p>
              </div>
            ) : (
              <>
                <header className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: tezcaTheme.border }}>
                  <div
                    className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: tezcaTheme.accentGradient, color: '#fff' }}
                  >
                    {nameInitials(activeThread.otherUserName)}
                  </div>
                  <div>
                    <p className="m-0 font-semibold text-sm" style={{ color: tezcaTheme.text }}>{activeThread.otherUserName}</p>
                    <p className="m-0 text-xs opacity-60">{roleBadgeLabel(activeThread.otherUserRole)}</p>
                  </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                  {messagesLoading && (
                    <div className="space-y-3 py-2">
                      {[60, 80, 50, 70].map((w, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                          <div
                            className="h-9 rounded-xl animate-pulse"
                            style={{ width: `${w}%`, backgroundColor: 'rgba(45, 212, 191, 0.1)' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {!messagesLoading && messages.length === 0 && (
                    <p className="text-xs opacity-50 text-center py-6 m-0">
                      Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
                    </p>
                  )}
                  {!messagesLoading && messages.map((m) => {
                    const mine = m.senderId === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${mine ? 'items-end' : 'items-start'} gap-0.5`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'rounded-tr-md' : 'rounded-tl-md'}`}
                          style={{
                            backgroundColor: mine ? 'rgba(45, 212, 191, 0.18)' : tezcaTheme.subtleBg,
                            color: tezcaTheme.text,
                            border: mine ? '1px solid rgba(45,212,191,0.25)' : `1px solid ${tezcaTheme.border}`,
                          }}
                        >
                          {!mine && (
                            <p className="m-0 text-xs font-semibold mb-0.5" style={{ color: tezcaTheme.accentDark }}>{m.authorName}</p>
                          )}
                          <p className="m-0 whitespace-pre-wrap leading-relaxed">
                            {renderCommunityMessageContent(m.content)}
                          </p>
                        </div>
                        <span className="text-[10px] opacity-40 px-1">{formatTime(m.createdAt)}</span>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                {typingText && (
                  <p className="m-0 px-4 pb-1 text-xs opacity-60 animate-pulse">{typingText}</p>
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
