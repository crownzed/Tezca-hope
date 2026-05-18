import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Sparkles,
  Send,
  Trash2,
  LogIn,
  ShieldAlert,
  Zap,
  Cpu,
  User,
  History,
  ChevronRight,
  CloudOff,
} from 'lucide-react';
import {
  loadAiChatForUser,
  saveAiChatForUser,
  migrateLegacyAiChat,
  type ChatMessage,
} from '../../lib/healthStorage';
import { groupChatByDay, previewChatLine } from '../../lib/aiChatHistory';
import { mockAiReply } from '../../lib/mockAi';
import { apiFetch } from '../../lib/api';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { ROUTES } from '../../routes';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

const SUGGESTIONS = [
  'Hôm nay mình khó ngủ — có gợi ý thư giãn trước khi đi ngủ không?',
  'Gợi ý bữa sáng lành mạnh, ít chế biến?',
  'BMI của mình đang thừa cân — làm sao theo dõi an toàn?',
  'Chào Tezca, mình cần động lực để đi bộ đều đặn.',
];

export function AiChatPage() {
  const { token, user, sessionReady } = usePatientAuth();
  const userId = user?.id ?? null;
  const canPersist = Boolean(token && userId);

  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const persistMessages = useCallback(
    (list: ChatMessage[]) => {
      if (!canPersist || !userId || !token) return;
      saveAiChatForUser(userId, list);
      apiFetch('/api/me/bot-messages', {
        method: 'PUT',
        token,
        body: JSON.stringify({ messages: list }),
      }).catch(() => {});
    },
    [canPersist, userId, token],
  );

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setInput(decodeURIComponent(q));
      setSearchParams({}, { replace: true });
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  useEffect(() => {
    if (!sessionReady) return;

    if (!canPersist) {
      setMessages([]);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);

    apiFetch<{ messages: ChatMessage[] }>('/api/me/bot-messages', { token: token! })
      .then((r) => {
        if (cancelled) return;
        const fromServer = Array.isArray(r.messages) ? r.messages : [];
        const list =
          fromServer.length > 0 ? fromServer : migrateLegacyAiChat(userId!);
        setMessages(list);
        saveAiChatForUser(userId, list);
      })
      .catch(() => {
        if (cancelled) return;
        const cached = loadAiChatForUser(userId);
        setMessages(cached);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionReady, canPersist, userId, token]);

  const scrollToMessage = (id: string) => {
    messageRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const clearChat = () => {
    if (!messages.length) return;
    const msg = canPersist
      ? 'Xóa toàn bộ lịch sử chat trên tài khoản? Hành động này đồng bộ lên server.'
      : 'Xóa tin nhắn trong phiên này? (Chưa đăng nhập — không có lịch sử lưu trữ.)';
    if (!window.confirm(msg)) return;
    setMessages([]);
    if (canPersist) persistMessages([]);
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || pending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      ts: Date.now(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    if (canPersist) persistMessages(next);
    setInput('');
    setPending(true);

    try {
      if (canPersist) {
        const apiMsgs = next.map(({ role, content }) => ({ role, content }));
        const r = await apiFetch<{ content: string }>('/api/me/ai-chat', {
          method: 'POST',
          token: token!,
          body: JSON.stringify({ messages: apiMsgs }),
        });
        const reply: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: r.content,
          ts: Date.now(),
        };
        const withReply = [...next, reply];
        setMessages(withReply);
        persistMessages(withReply);
      } else {
        await sleep(600 + Math.random() * 400);
        const reply: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: mockAiReply(text),
          ts: Date.now(),
        };
        const withReply = [...next, reply];
        setMessages(withReply);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: canPersist
          ? `Không nhận được phản hồi từ AI (${errMsg}). Vui lòng thử lại sau.`
          : `Không gọi được AI trên server (${errMsg}). Bạn vẫn có thể hỏi — phản hồi demo cục bộ sẽ dùng khi chưa đăng nhập.`,
        ts: Date.now(),
      };
      const withReply = [...next, reply];
      setMessages(withReply);
      if (canPersist) persistMessages(withReply);
    } finally {
      setPending(false);
    }
  };

  const liveMode = canPersist;
  const dayGroups = liveMode ? groupChatByDay(messages) : [];

  return (
    <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-4" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      {liveMode && (
        <aside
          className="lg:w-72 shrink-0 rounded-2xl border overflow-hidden flex flex-col max-h-[min(56vh,520px)] lg:max-h-[calc(100vh-10rem)]"
          style={{
            borderColor: 'rgba(26, 32, 44, 0.08)',
            backgroundColor: 'white',
            boxShadow: '0 8px 32px -12px rgba(26, 32, 44, 0.1)',
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center gap-2 shrink-0"
            style={{ borderColor: 'rgba(26, 32, 44, 0.06)', backgroundColor: 'rgba(45, 212, 191, 0.08)' }}
          >
            <History size={18} style={{ color: '#0F766E' }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold m-0" style={{ color: '#1A202C' }}>
                Lịch sử chat
              </p>
              <p className="text-[11px] opacity-60 m-0 truncate" style={{ color: '#1A202C' }}>
                {user?.name} · đồng bộ tài khoản
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {historyLoading ? (
              <p className="text-xs text-center py-6 opacity-50 m-0" style={{ color: '#1A202C' }}>
                Đang tải lịch sử…
              </p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-center py-6 opacity-50 m-0 px-2 leading-relaxed" style={{ color: '#1A202C' }}>
                Chưa có tin nhắn đã lưu. Bắt đầu hội thoại — mọi tin sẽ được lưu trên tài khoản.
              </p>
            ) : (
              <ul className="m-0 p-0 list-none space-y-3">
                {dayGroups.map((group) => (
                  <li key={group.dateKey}>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1.5 m-0 opacity-45"
                      style={{ color: '#1A202C' }}
                    >
                      {group.label}
                    </p>
                    <ul className="m-0 p-0 list-none space-y-0.5">
                      {group.messages.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => scrollToMessage(m.id)}
                            className="w-full text-left rounded-xl px-2.5 py-2 text-xs border-0 cursor-pointer transition-colors hover:bg-teal-50/80 flex items-start gap-1.5"
                            style={{ color: '#1A202C', backgroundColor: 'transparent' }}
                          >
                            <ChevronRight size={14} className="shrink-0 mt-0.5 opacity-35" />
                            <span className="min-w-0 flex-1">
                              <span
                                className="font-semibold block opacity-70"
                                style={{ color: m.role === 'user' ? '#0F766E' : '#475569' }}
                              >
                                {m.role === 'user' ? 'Bạn' : 'Tezca AI'} · {formatTime(m.ts)}
                              </span>
                              <span className="block opacity-80 leading-snug mt-0.5">
                                {previewChatLine(m.content)}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[10px] text-center px-3 py-2 m-0 border-t opacity-45" style={{ borderColor: 'rgba(26,32,44,0.06)', color: '#64748B' }}>
            {messages.length} tin · chạm để cuộn tới tin trong hội thoại
          </p>
        </aside>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div
          className="rounded-2xl border p-5 md:p-6 overflow-hidden relative"
          style={{
            borderColor: 'rgba(26, 32, 44, 0.08)',
            background:
              'linear-gradient(135deg, rgba(45, 212, 191, 0.14) 0%, rgba(255,255,255,0.95) 45%, rgba(249, 249, 251, 1) 100%)',
            boxShadow: '0 12px 40px -20px rgba(20, 184, 166, 0.25)',
          }}
        >
          <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full opacity-30 blur-3xl pointer-events-none bg-teal-400" />
          <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
              style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
            >
              <Sparkles className="text-white" size={28} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h1 className="text-2xl md:text-3xl font-bold m-0 tracking-tight" style={{ color: '#1A202C' }}>
                  Tezca AI
                </h1>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: liveMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                    color: liveMode ? '#047857' : '#475569',
                  }}
                >
                  {liveMode ? (
                    <>
                      <Zap size={12} /> Gemini · có lịch sử
                    </>
                  ) : (
                    <>
                      <Cpu size={12} /> Phiên tạm
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm opacity-75 mt-2 m-0 leading-relaxed" style={{ color: '#1A202C' }}>
                {liveMode
                  ? 'Hội thoại được lưu trên tài khoản và đồng bộ server — xem lịch sử bên trái (màn hình lớn) hoặc cuộn trong khung chat.'
                  : 'Bạn có thể hỏi ngay không cần đăng nhập. Tin nhắn chỉ tồn tại trong phiên này — đóng trang hoặc tải lại sẽ mất.'}
              </p>
              {!liveMode && (
                <Link
                  to={ROUTES.app.login}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold no-underline"
                  style={{ color: '#0F766E' }}
                >
                  <LogIn size={16} />
                  Đăng nhập để lưu lịch sử &amp; dùng Gemini
                </Link>
              )}
            </div>
          </div>

          {!liveMode && (
            <div
              className="relative mt-4 flex items-start gap-2 text-xs rounded-xl px-3 py-2.5"
              style={{ backgroundColor: 'rgba(100, 116, 139, 0.08)', color: '#475569' }}
            >
              <CloudOff size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong>Không lưu lịch sử</strong> khi chưa đăng nhập. Phản hồi demo trên thiết bị — không đồng bộ server.
              </span>
            </div>
          )}

          <div
            className="relative mt-4 flex flex-wrap items-center gap-2 text-xs rounded-xl px-3 py-2.5"
            style={{ backgroundColor: 'rgba(26, 32, 44, 0.04)', color: '#475569' }}
          >
            <ShieldAlert size={14} className="shrink-0 text-amber-600/90" />
            <span>
              Nội dung chỉ mang tính thông tin. Cấp cứu / ý định tự hại — gọi <strong>115</strong> hoặc đến cơ sở y tế.
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearChat}
            disabled={!messages.length || pending || historyLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition-opacity disabled:opacity-35"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)', color: '#64748B' }}
          >
            <Trash2 size={14} />
            {canPersist ? 'Xóa lịch sử đã lưu' : 'Xóa phiên hiện tại'}
          </button>
        </div>

        <div
          className="flex-1 flex flex-col rounded-2xl border overflow-hidden min-h-[380px] max-h-[min(56vh,520px)]"
          style={{
            borderColor: 'rgba(26, 32, 44, 0.08)',
            backgroundColor: 'white',
            boxShadow: '0 8px 32px -12px rgba(26, 32, 44, 0.12)',
          }}
        >
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
            {messages.length === 0 && !historyLoading && (
              <div className="text-center py-6 md:py-10 px-2">
                <p className="text-sm font-medium m-0 mb-4" style={{ color: '#1A202C' }}>
                  Bắt đầu nhanh — chạm một gợi ý hoặc gõ câu hỏi:
                </p>
                <div className="flex flex-col gap-2 max-w-md mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      disabled={pending}
                      className="text-left text-sm px-4 py-3 rounded-xl border transition-all hover:shadow-md disabled:opacity-50"
                      style={{
                        borderColor: 'rgba(45, 212, 191, 0.35)',
                        backgroundColor: 'rgba(45, 212, 191, 0.06)',
                        color: '#1A202C',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {historyLoading && messages.length === 0 && (
              <p className="text-sm text-center py-10 opacity-50 m-0" style={{ color: '#1A202C' }}>
                Đang tải lịch sử hội thoại…
              </p>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                ref={(el) => {
                  messageRefs.current[m.id] = el;
                }}
                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                  style={
                    m.role === 'user'
                      ? { backgroundColor: 'rgba(26, 32, 44, 0.08)', color: '#1A202C' }
                      : {
                          background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                          color: 'white',
                        }
                  }
                  aria-hidden
                >
                  {m.role === 'user' ? <User size={18} strokeWidth={2} /> : <Sparkles size={18} strokeWidth={2} />}
                </div>
                <div className={`min-w-0 max-w-[88%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div
                    className="inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed text-left whitespace-pre-wrap break-words"
                    style={
                      m.role === 'user'
                        ? {
                            background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                            color: 'white',
                            borderBottomRightRadius: '6px',
                          }
                        : {
                            backgroundColor: 'rgba(45, 212, 191, 0.09)',
                            color: '#1A202C',
                            border: '1px solid rgba(45, 212, 191, 0.22)',
                            borderBottomLeftRadius: '6px',
                          }
                    }
                  >
                    {m.content}
                  </div>
                  <p className="text-[11px] opacity-45 mt-1.5 m-0 px-1" style={{ color: '#1A202C' }}>
                    {m.role === 'user' ? 'Bạn' : 'Tezca AI'} · {formatTime(m.ts)}
                    {liveMode && (
                      <span className="opacity-70"> · đã lưu</span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {pending && (
              <div className="flex gap-3">
                <div
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
                >
                  <Sparkles size={18} className="text-white" />
                </div>
                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-2 border"
                  style={{
                    borderColor: 'rgba(26, 32, 44, 0.06)',
                    backgroundColor: 'rgba(26, 32, 44, 0.03)',
                    color: '#1A202C',
                  }}
                >
                  <span className="text-sm opacity-70">Tezca AI đang soạn</span>
                  <span className="text-teal-600/90 animate-pulse ml-0.5" aria-hidden>
                    …
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            className="border-t p-3 md:p-4 flex gap-2 items-end"
            style={{ borderColor: 'rgba(26, 32, 44, 0.06)', backgroundColor: 'rgba(249, 249, 251, 0.9)' }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={
                canPersist
                  ? 'Nhập tin nhắn — sẽ lưu vào lịch sử tài khoản…'
                  : 'Hỏi Tezca AI (phiên tạm, không lưu)…'
              }
              disabled={pending || historyLoading}
              className="flex-1 rounded-xl px-4 py-3 text-sm border resize-y min-h-[48px] max-h-36 outline-none focus:ring-2 focus:ring-teal-400/40 disabled:opacity-55"
              style={{ borderColor: 'rgba(26, 32, 44, 0.12)', backgroundColor: 'white', color: '#1A202C' }}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending || historyLoading || !input.trim()}
              className="shrink-0 h-12 w-12 md:w-auto md:px-5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-45 transition-transform active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
              aria-label="Gửi tin nhắn"
            >
              <Send size={20} />
              <span className="hidden md:inline">Gửi</span>
            </button>
          </div>
        </div>

        {liveMode && messages.length > 0 && (
          <details className="lg:hidden rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(26,32,44,0.08)' }}>
            <summary
              className="px-4 py-3 text-sm font-semibold cursor-pointer list-none flex items-center gap-2"
              style={{ color: '#1A202C', backgroundColor: 'rgba(45,212,191,0.08)' }}
            >
              <History size={16} style={{ color: '#0F766E' }} />
              Lịch sử chat ({messages.length} tin)
            </summary>
            <div className="max-h-48 overflow-y-auto p-2 border-t" style={{ borderColor: 'rgba(26,32,44,0.06)' }}>
              {dayGroups.map((group) => (
                <div key={group.dateKey} className="mb-3 last:mb-0">
                  <p className="text-[10px] font-semibold uppercase opacity-45 px-2 m-0 mb-1">{group.label}</p>
                  {group.messages.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => scrollToMessage(m.id)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg border-0 bg-transparent"
                      style={{ color: '#1A202C' }}
                    >
                      <span className="font-medium opacity-60">{m.role === 'user' ? 'Bạn' : 'AI'} · </span>
                      {previewChatLine(m.content, 48)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
