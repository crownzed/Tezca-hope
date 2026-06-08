import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Loader2, RefreshCw, Send, Stethoscope, User, Wifi, WifiOff } from 'lucide-react';
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
    const rows: { type: 'day'; key: string; label: string } | { type: 'msg'; message: LiveMessage }[] = [];
    let lastDay = '';
    for (const m of messages) {
      const dk = dayKey(m.ts);
      if (dk !== lastDay) {
        lastDay = dk;
        rows.push({ type: 'day', key: dk, label: formatDayLabel(m.ts) });
      }
      rows.push({ type: 'msg', message: m });
    }
    return rows;
  }, [messages]);

  const peerInitials = header?.peerName ? initials(header.peerName) : viewer === 'customer' ? 'CG' : 'KH';
  const connected = ready && !loading;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {(header?.peerName || header?.title) && (
        <div
          className="shrink-0 mb-3 rounded-2xl border px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
        >
          <div
            className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-sm font-semibold"
            style={{
              background: tezcaTheme.accentGradient,
              color: '#fff',
              boxShadow: '0 4px 14px -4px rgba(20, 184, 166, 0.55)',
            }}
          >
            {peerInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold m-0 truncate" style={{ color: tezcaTheme.text }}>
              {header.peerName ?? header.title}
            </p>
            {header.peerEmail && (
              <p className="text-xs m-0 truncate mt-0.5" style={{ color: tezcaTheme.textMuted }}>
                {header.peerEmail}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: connected ? 'rgba(45, 212, 191, 0.12)' : 'rgba(26, 32, 44, 0.06)',
                  color: connected ? tezcaTheme.accentDark : tezcaTheme.textMuted,
                }}
              >
                {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {connected ? 'Sẵn sàng chat' : 'Đang kết nối…'}
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
              className="shrink-0 p-2 rounded-xl border hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.subtleBg }}
              aria-label="Làm mới tin nhắn"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: tezcaTheme.accentDark }} />
            </button>
          )}
        </div>
      )}

      {toolbar && <div className="shrink-0 mb-3">{toolbar}</div>}

      <div
        className="flex-1 min-h-[280px] max-h-[min(52vh,520px)] overflow-y-auto rounded-2xl border px-3 py-4 space-y-1 scroll-smooth"
        style={{ backgroundColor: tezcaTheme.subtleBg, borderColor: tezcaTheme.border }}
        role="log"
        aria-live="polite"
        aria-label="Lịch sử trò chuyện"
      >
        {loading && (
          <p
            className="text-sm text-center py-12 m-0 flex items-center justify-center gap-2"
            style={{ color: tezcaTheme.textMuted }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải lịch sử chat…
          </p>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.accentDark }}
            >
              <Stethoscope size={26} />
            </div>
            <p className="text-sm font-semibold m-0" style={{ color: tezcaTheme.text }}>
              {emptyTitle ?? 'Chưa có tin nhắn'}
            </p>
            <p className="text-xs mt-2 m-0 max-w-[240px] leading-relaxed" style={{ color: tezcaTheme.textMuted }}>
              {emptyHint ??
                (viewer === 'customer'
                  ? 'Gửi lời nhắn đầu tiên — chuyên gia sẽ phản hồi trong thời gian sớm nhất.'
                  : 'Bắt đầu trò chuyện với khách hàng hoặc chọn mẫu trả lời nhanh bên dưới.')}
            </p>
          </div>
        )}
        {grouped.map((row) => {
          if (row.type === 'day') {
            return (
              <div key={`day-${row.key}`} className="flex justify-center py-2">
                <span
                  className="text-[11px] font-medium px-3 py-1 rounded-full"
                  style={{ backgroundColor: tezcaTheme.surface, color: tezcaTheme.textMuted, border: `1px solid ${tezcaTheme.border}` }}
                >
                  {row.label}
                </span>
              </div>
            );
          }
          const m = row.message;
          const mine = isMine(m);
          const role = normalizeSenderRole(m.senderRole);
          return (
            <div key={m.id} className={`flex gap-2 py-1 ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && (
                <div
                  className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-5"
                  style={{ backgroundColor: 'rgba(45, 212, 191, 0.12)', color: tezcaTheme.accentDark }}
                  aria-hidden
                >
                  {viewer === 'customer' ? <Stethoscope size={16} /> : <User size={16} />}
                </div>
              )}
              <div className={`max-w-[min(82%,340px)] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {viewer === 'expert' && !mine && (
                  <span className="text-[11px] font-medium mb-1 px-1" style={{ color: tezcaTheme.textMuted }}>
                    Khách hàng
                  </span>
                )}
                {viewer === 'customer' && !mine && (
                  <span className="text-[11px] font-medium mb-1 px-1" style={{ color: tezcaTheme.textMuted }}>
                    Chuyên gia
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    mine ? 'rounded-tr-md' : 'rounded-tl-md'
                  }`}
                  style={
                    mine
                      ? { background: tezcaTheme.accentGradient, color: '#fff' }
                      : {
                          backgroundColor: tezcaTheme.surface,
                          border: `1px solid ${tezcaTheme.borderStrong}`,
                          color: tezcaTheme.text,
                        }
                  }
                >
                  <p className="m-0 leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                </div>
                <span className="text-[10px] mt-1 px-1 tabular-nums" style={{ color: tezcaTheme.textMuted }}>
                  {formatClock(m.ts)}
                  {mine && role === 'expert' ? ' · Bạn' : ''}
                </span>
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-end py-1">
            <div
              className="rounded-2xl rounded-tr-md px-4 py-2.5 text-xs flex items-center gap-2"
              style={{ backgroundColor: 'rgba(45, 212, 191, 0.2)', color: tezcaTheme.accentDark }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang gửi…
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 pt-3 space-y-2">
        {sendError && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 m-0">{sendError}</p>
        )}
        {quickReplies && quickReplies.length > 0 && onQuickReply && (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => onQuickReply(q.text)}
                disabled={!ready || sending}
                className="text-xs font-medium px-3 py-1.5 rounded-full border bg-white hover:bg-teal-50 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                style={{ borderColor: 'rgba(45, 212, 191, 0.35)', color: tezcaTheme.accentDark }}
              >
                {q.icon}
                {q.label}
              </button>
            ))}
          </div>
        )}
        <div
          className="flex gap-2 items-end rounded-2xl border p-2"
          style={{ borderColor: tezcaTheme.borderStrong, backgroundColor: tezcaTheme.surface }}
        >
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
            className="flex-1 min-w-0 max-h-[120px] resize-none bg-transparent border-0 px-2 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-0"
            style={{ color: tezcaTheme.text }}
            placeholder={ready ? placeholder : 'Đang kết nối…'}
            aria-label="Nội dung tin nhắn"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!ready || sending || !draft.trim()}
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-opacity mb-0.5"
            style={{ background: tezcaTheme.accentGradient }}
            aria-label="Gửi tin nhắn"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <p className="text-[10px] m-0 text-center" style={{ color: tezcaTheme.textMuted }}>
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </div>
  );
}
