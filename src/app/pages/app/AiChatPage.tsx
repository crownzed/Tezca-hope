import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Sparkles, Send, Trash2, LogIn, User, History } from 'lucide-react';
import {
  loadAiChatForUser,
  saveAiChatForUser,
  migrateLegacyAiChat,
  type ChatMessage,
} from '../../lib/healthStorage';
import {
  groupChatByTurn,
  groupTurnsByDay,
  removeMessageById,
  removeTurnById,
} from '../../lib/aiChatHistory';
import { mockAiReply } from '../../lib/mockAi';
import { apiFetch } from '../../lib/api';
import { polishAiText } from '../../lib/polishAiText';
import { simulateTextStream, streamAiChat } from '../../lib/streamAiChat';
import { useCustomerSession } from '../../lib/customerSessionGate';
import { ROUTES } from '../../routes';
import { ChatHistoryPanel } from '../../components/ChatHistoryPanel';

const SUGGESTIONS = [
  'Hôm nay mình khó ngủ — có gợi ý thư giãn trước khi đi ngủ không?',
  'Gợi ý bữa sáng lành mạnh, ít chế biến?',
  'BMI của mình đang thừa cân — làm sao theo dõi an toàn?',
  'Chào Tezca, mình cần động lực để đi bộ đều đặn.',
];

export function AiChatPage() {
  const { token, user, sessionReady, isAuthenticated } = useCustomerSession();
  const userId = user?.id ?? null;
  const canPersist = isAuthenticated;

  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const abortRef = useRef<AbortController | null>(null);

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
  }, [messages, pending, streamingId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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

  const applyMessages = useCallback(
    (list: ChatMessage[]) => {
      setMessages(list);
      if (canPersist) persistMessages(list);
    },
    [canPersist, persistMessages],
  );

  const clearChat = () => {
    if (!messages.length) return;
    const msg = canPersist
      ? 'Xóa toàn bộ lịch sử chat trên tài khoản? Hành động này đồng bộ lên server.'
      : 'Xóa tin nhắn trong phiên này? (Chưa đăng nhập — không có lịch sử lưu trữ.)';
    if (!window.confirm(msg)) return;
    applyMessages([]);
  };

  const deleteTurn = (turnId: string) => {
    if (
      !window.confirm(
        'Xóa đoạn hội thoại này khỏi lịch sử tài khoản? (Câu hỏi và phản hồi AI liên quan sẽ bị xóa.)',
      )
    ) {
      return;
    }
    applyMessages(removeTurnById(messages, turnId));
  };

  const deleteMessage = (messageId: string) => {
    if (!window.confirm('Xóa tin nhắn này khỏi lịch sử tài khoản?')) return;
    applyMessages(removeMessageById(messages, messageId));
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

    const replyId = crypto.randomUUID();
    const replyShell: ChatMessage = {
      id: replyId,
      role: 'assistant',
      content: '',
      ts: Date.now(),
    };
    const withShell = [...next, replyShell];
    setMessages(withShell);
    setStreamingId(replyId);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const patchStreaming = (content: string) => {
      setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content } : m)));
    };

    try {
      let finalContent: string;

      if (canPersist) {
        const apiMsgs = next.map(({ role, content }) => ({ role, content }));
        try {
          finalContent = await streamAiChat({
            token: token!,
            messages: apiMsgs,
            onDelta: patchStreaming,
            signal: ac.signal,
          });
        } catch {
          const r = await apiFetch<{ content: string }>('/api/me/ai-chat', {
            method: 'POST',
            token: token!,
            body: JSON.stringify({ messages: apiMsgs }),
            signal: ac.signal,
          });
          finalContent = polishAiText(r.content);
          await simulateTextStream(finalContent, patchStreaming, { signal: ac.signal });
        }
      } else {
        finalContent = await simulateTextStream(mockAiReply(text), patchStreaming, {
          signal: ac.signal,
        });
      }

      const reply: ChatMessage = {
        id: replyId,
        role: 'assistant',
        content: finalContent,
        ts: Date.now(),
      };
      const withReply = [...next, reply];
      setMessages(withReply);
      if (canPersist) persistMessages(withReply);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
      const reply: ChatMessage = {
        id: replyId,
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
      setStreamingId(null);
      setPending(false);
      abortRef.current = null;
    }
  };

  const liveMode = canPersist;
  const dayTurnGroups = liveMode ? groupTurnsByDay(groupChatByTurn(messages)) : [];

  return (
    <div className={`mx-auto flex flex-col lg:flex-row gap-4 ${liveMode ? 'max-w-5xl' : 'max-w-4xl'}`} style={{ minHeight: 'calc(100vh - 8rem)' }}>
      {liveMode && (
        <aside
          className="hidden lg:flex lg:w-72 shrink-0 rounded-2xl border overflow-hidden flex-col max-h-[calc(100vh-10rem)]"
          style={{
            borderColor: 'rgba(26, 32, 44, 0.08)',
            backgroundColor: 'white',
            boxShadow: '0 8px 32px -12px rgba(26, 32, 44, 0.1)',
          }}
        >
          <ChatHistoryPanel
            dayTurnGroups={dayTurnGroups}
            historyLoading={historyLoading}
            messageCount={messages.length}
            onScrollTo={scrollToMessage}
            onDeleteTurn={deleteTurn}
          />
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
              <h1 className="text-2xl md:text-3xl font-bold m-0 tracking-tight" style={{ color: '#1A202C' }}>
                Tezca AI
              </h1>
              {!liveMode && (
                <Link
                  to={ROUTES.app.login}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold no-underline"
                  style={{ color: '#0F766E' }}
                >
                  <LogIn size={16} />
                  Đăng nhập
                </Link>
              )}
            </div>
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
                className={`group flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
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
                <div className={`relative min-w-0 max-w-[88%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {liveMode && (
                    <button
                      type="button"
                      onClick={() => deleteMessage(m.id)}
                      disabled={pending}
                      title="Xóa tin nhắn này"
                      className={`absolute -top-1 ${m.role === 'user' ? 'left-0' : 'right-0'} p-1 rounded-lg border-0 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-30 hover:bg-red-50`}
                      style={{ color: '#B91C1C' }}
                      aria-label="Xóa tin nhắn"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed text-left whitespace-pre-wrap break-words ${
                      m.role === 'assistant' && m.id === streamingId ? 'transition-[opacity] duration-150' : ''
                    }`}
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
                    {m.role === 'assistant' && m.id === streamingId && (
                      <span
                        className="inline-block w-0.5 h-[1em] align-middle ml-0.5 bg-teal-500/80 animate-pulse rounded-full"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {pending && !streamingId && (
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
              placeholder="Nhập tin nhắn…"
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

        {liveMode && (
          <details className="lg:hidden rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: 'rgba(26,32,44,0.08)' }}>
            <summary
              className="px-4 py-3 text-sm font-semibold cursor-pointer list-none flex items-center gap-2"
              style={{ color: '#1A202C', backgroundColor: 'rgba(45,212,191,0.08)' }}
            >
              <History size={16} style={{ color: '#0F766E' }} />
              Lịch sử riêng tư ({messages.length} tin)
            </summary>
            <div className="max-h-56 overflow-hidden flex flex-col border-t" style={{ borderColor: 'rgba(26,32,44,0.06)' }}>
              <ChatHistoryPanel
                compact
                dayTurnGroups={dayTurnGroups}
                historyLoading={historyLoading}
                messageCount={messages.length}
                onScrollTo={scrollToMessage}
                onDeleteTurn={deleteTurn}
              />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
