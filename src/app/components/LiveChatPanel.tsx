import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Loader2, RefreshCw, Send, Stethoscope, User, WifiOff, Zap } from 'lucide-react';
import type { LiveMessage } from '../lib/liveChat';
import { tezcaTheme } from '../lib/tezcaTheme';

function normalizeSenderRole(role: string) {
  return role === 'patient' ? 'customer' : role;
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function dayKey(ts: number) {
  return new Date(ts).toLocaleDateString('sv-SE');
}

function formatDayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (startOf(today) - startOf(d)) / 86400000;
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type QuickReply = {
  label: string;
  text: string;
  icon?: ReactNode;
};

export type LiveChatHeader = {
  title?: string;
  peerName?: string;
  peerEmail?: string;
  transportLabel?: string;
  onRefresh?: () => void;
};

type LiveChatPanelProps = {
  messages: LiveMessage[];
  loading: boolean;
  ready: boolean;
  sending: boolean;
  sendError: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  viewer: 'customer' | 'expert';
  myUserId?: string;
  placeholder: string;
  className?: string;
  quickReplies?: QuickReply[];
  onQuickReply?: (text: string) => void;
  header?: LiveChatHeader;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
};

export function LiveChatPanel({
  messages,
  loading,
  ready,
  sending,
  sendError,
  draft,
  onDraftChange,
  onSend,
  viewer,
  myUserId,
  placeholder,
  className = '',
  quickReplies,
  onQuickReply,
  header,
  toolbar,
  emptyTitle,
  emptyHint,
}: LiveChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const isMine = (m: LiveMessage) => {
    const role = normalizeSenderRole(m.senderRole);
    if (viewer === 'customer') return role === 'customer';
    return role === 'expert' && (!myUserId || m.senderUserId === myUserId);
  };

  const grouped = useMemo(() => {
    type Row =
      | { type: 'day'; key: string; label: string }
      | { type: 'msg'; message: LiveMessage; showAvatar: boolean };
    const rows: Row[] = [];
    let lastDay = '';
    let lastRole = '';
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const dk = dayKey(m.ts);
      if (dk !== lastDay) {
        lastDay = dk;
        lastRole = '';
        rows.push({ type: 'day', key: dk, label: formatDayLabel(m.ts) });
      }
      const role = normalizeSenderRole(m.senderRole);
      const showAvatar = role !== lastRole;
      lastRole = role;
      rows.push({ type: 'msg', message: m, showAvatar });
    }
    return rows;
  }, [messages]);

  const peerInitials = header?.peerName ? initials(header.peerName) : viewer === 'customer' ? 'CG' : 'KH';
  const connected = ready && !loading;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {(header?.peerName || header?.title) && (
        <div
          className="shrink-0 mb-3 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(255,255,255,0.98) 100%)',
            border: `1px solid ${tezcaTheme.borderStrong}`,
            boxShadow: '0 2px 12px -4px rgba(20,184,166,0.15)',
          }}
        >
          <div
            className="relative w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold"
            style={{
              background: tezcaTheme.accentGradient,
              color: '#fff',
              boxShadow: '0 4px 16px -4px rgba(20, 184, 166, 0.6)',
              letterSpacing: '0.05em',
            }}
          >
            {peerInitials}
            {connected && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                style={{ backgroundColor: '#22c55e' }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold m-0 truncate" style={{ color: tezcaTheme.text }}>
              {header.peerName ?? header.title}
            </p>
            {header.peerEmail && (
              <p className="text-xs m-0 truncate" style={{ color: tezcaTheme.textMuted }}>
                {header.peerEmail}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: connected ? 'rgba(34,197,94,0.12)' : 'rgba(26,32,44,0.06)',
                  color: connected ? '#15803d' : tezcaTheme.textMuted,
                }}
              >
                {connected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Đang hoạt động
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    Đang kết nối…
                  </>
                )}
              </span>
              {header.transportLabel && (
                <span className="text-[11px]" style={{ color: tezcaTheme.textMuted }}>
                  · {header.transportLabel}
                </span>
              )}
            </div>
          </div>
          {header.onRefresh && (
            <button
              type="button"
              onClick={header.onRefresh}
              disabled={loading}
              className="shrink-0 p-2.5 rounded-xl border hover:opacity-90 disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.subtleBg }}
              aria-label="Làm mới tin nhắn"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                style={{ color: tezcaTheme.accentDark }}
              />
            </button>
          )}
        </div>
      )}

      {toolbar && <div className="shrink-0 mb-3">{toolbar}</div>}

      <div
        className="flex-1 min-h-[280px] max-h-[min(52vh,520px)] overflow-y-auto rounded-2xl px-3 py-4 space-y-0.5 scroll-smooth"
        style={{
          background: 'linear-gradient(180deg, rgba(45,212,191,0.04) 0%, rgba(249,249,251,0.8) 100%)',
          border: `1px solid ${tezcaTheme.border}`,
        }}
        role="log"
        aria-live="polite"
        aria-label="Lịch sử trò chuyện"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: tezcaTheme.accentGradient }}
            >
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <p className="text-sm m-0" style={{ color: tezcaTheme.textMuted }}>
              Đang tải lịch sử chat…
            </p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-4">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.18) 0%, rgba(20,184,166,0.08) 100%)',
                border: '1.5px dashed rgba(20,184,166,0.4)',
              }}
            >
              <Stethoscope size={28} style={{ color: tezcaTheme.accentDark }} />
            </div>
            <div>
              <p className="text-sm font-bold m-0" style={{ color: tezcaTheme.text }}>
                {emptyTitle ?? 'Chưa có tin nhắn'}
              </p>
              <p
                className="text-xs mt-1.5 m-0 max-w-[240px] leading-relaxed"
                style={{ color: tezcaTheme.textMuted }}
              >
                {emptyHint ??
                  (viewer === 'customer'
                    ? 'Gửi lời nhắn đầu tiên — chuyên gia sẽ phản hồi sớm nhất.'
                    : 'Bắt đầu trò chuyện hoặc chọn mẫu trả lời nhanh bên dưới.')}
              </p>
            </div>
          </div>
        )}
        {grouped.map((row) => {
          if (row.type === 'day') {
            return (
              <div key={`day-${row.key}`} className="flex items-center gap-2 py-3">
                <div className="flex-1 h-px" style={{ backgroundColor: tezcaTheme.border }} />
                <span
                  className="text-[11px] font-medium px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: tezcaTheme.surface,
                    color: tezcaTheme.textMuted,
                    border: `1px solid ${tezcaTheme.borderStrong}`,
                    boxShadow: '0 1px 4px -1px rgba(26,32,44,0.06)',
                  }}
                >
                  {row.label}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: tezcaTheme.border }} />
              </div>
            );
          }
          const m = row.message;
          const mine = isMine(m);
          const role = normalizeSenderRole(m.senderRole);
          const showAvatar = row.showAvatar;
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'} ${showAvatar ? 'pt-2' : 'pt-0.5'}`}>
              {!mine && (
                <div className="w-8 shrink-0 flex flex-col justify-end">
                  {showAvatar && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(45,212,191,0.2) 0%, rgba(20,184,166,0.1) 100%)',
                        border: '1px solid rgba(20,184,166,0.25)',
                        color: tezcaTheme.accentDark,
                      }}
                      aria-hidden
                    >
                      {viewer === 'customer' ? <Stethoscope size={15} /> : <User size={15} />}
                    </div>
                  )}
                </div>
              )}
              <div className={`max-w-[min(78%,360px)] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {showAvatar && !mine && (
                  <span
                    className="text-[11px] font-semibold mb-1 px-1"
                    style={{ color: tezcaTheme.accentDark }}
                  >
                    {viewer === 'customer' ? 'Chuyên gia' : 'Khách hàng'}
                  </span>
                )}
                <div
                  className="rounded-2xl px-4 py-2.5 text-sm"
                  style={
                    mine
                      ? {
                          background: tezcaTheme.accentGradient,
                          color: '#fff',
                          borderBottomRightRadius: showAvatar ? '6px' : undefined,
                          boxShadow: '0 4px 16px -6px rgba(20,184,166,0.5)',
                        }
                      : {
                          backgroundColor: tezcaTheme.surface,
                          border: `1px solid ${tezcaTheme.borderStrong}`,
                          color: tezcaTheme.text,
                          borderBottomLeftRadius: showAvatar ? '6px' : undefined,
                          boxShadow: '0 2px 8px -2px rgba(26,32,44,0.06)',
                        }
                  }
                >
                  <p className="m-0 leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                </div>
                <span
                  className="text-[10px] mt-1 px-1 tabular-nums select-none"
                  style={{ color: tezcaTheme.textMuted }}
                >
                  {formatClock(m.ts)}
                  {mine && role === 'expert' ? ' · Bạn' : ''}
                </span>
              </div>
              {mine && <div className="w-1 shrink-0" />}
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-end pt-0.5 pb-1 pr-1">
            <div
              className="rounded-2xl rounded-br-md px-4 py-2.5 text-xs flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.25) 0%, rgba(20,184,166,0.15) 100%)',
                color: tezcaTheme.accentDark,
                border: '1px solid rgba(20,184,166,0.2)',
              }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang gửi…
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 pt-3 space-y-2.5">
        {sendError && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 m-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            {sendError}
          </p>
        )}
        {quickReplies && quickReplies.length > 0 && onQuickReply && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {quickReplies.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => onQuickReply(q.text)}
                disabled={!ready || sending}
                className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full border bg-white inline-flex items-center gap-1.5 disabled:opacity-40 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  borderColor: 'rgba(45,212,191,0.4)',
                  color: tezcaTheme.accentDark,
                  boxShadow: '0 1px 4px -1px rgba(20,184,166,0.15)',
                }}
              >
                {q.icon && <span style={{ color: tezcaTheme.accent }}>{q.icon}</span>}
                {q.label}
              </button>
            ))}
          </div>
        )}
        <div
          className="flex gap-2 items-end rounded-2xl border p-2"
          style={{
            borderColor: ready ? tezcaTheme.borderStrong : tezcaTheme.border,
            backgroundColor: tezcaTheme.surface,
            boxShadow: ready ? '0 0 0 3px rgba(45,212,191,0.08)' : 'none',
            transition: 'box-shadow 0.2s',
          }}
        >
          {viewer === 'expert' && (
            <div
              className="shrink-0 self-end mb-2 ml-1 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.15) 0%, rgba(20,184,166,0.08) 100%)',
                color: tezcaTheme.accentDark,
              }}
            >
              <Stethoscope size={14} />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            disabled={!ready || sending}
            rows={1}
            className="flex-1 min-w-0 max-h-[120px] resize-none bg-transparent border-0 px-2 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-0 leading-relaxed"
            style={{ color: tezcaTheme.text }}
            placeholder={ready ? placeholder : 'Đang kết nối…'}
            aria-label="Nội dung tin nhắn"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!ready || sending || !draft.trim()}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 active:scale-95 mb-0.5"
            style={{ background: tezcaTheme.accentGradient, boxShadow: draft.trim() ? '0 4px 14px -4px rgba(20,184,166,0.6)' : 'none' }}
            aria-label="Gửi tin nhắn"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send size={18} className={draft.trim() ? 'translate-x-0.5' : ''} />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] flex items-center gap-1" style={{ color: tezcaTheme.textMuted }}>
            <Zap size={10} style={{ color: tezcaTheme.accent }} />
            Enter gửi · Shift+Enter xuống dòng
          </span>
          {draft.length > 20 && (
            <span className="text-[10px]" style={{ color: tezcaTheme.textMuted }}>
              {draft.length} ký tự
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
