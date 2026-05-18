import { ChevronRight, History, Lock, Trash2 } from 'lucide-react';
import type { ChatDayTurnGroup } from '../lib/aiChatHistory';
import { turnPreview } from '../lib/aiChatHistory';

function formatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

type Props = {
  dayTurnGroups: ChatDayTurnGroup[];
  historyLoading: boolean;
  messageCount: number;
  userName?: string;
  userEmail?: string;
  compact?: boolean;
  onScrollTo: (messageId: string) => void;
  onDeleteTurn: (turnId: string) => void;
};

export function ChatHistoryPanel({
  dayTurnGroups,
  historyLoading,
  messageCount,
  userName,
  userEmail,
  compact = false,
  onScrollTo,
  onDeleteTurn,
}: Props) {
  const turnCount = dayTurnGroups.reduce((n, g) => n + g.turns.length, 0);

  return (
    <>
      <div
        className={`border-b flex items-center gap-2 shrink-0 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
        style={{ borderColor: 'rgba(26, 32, 44, 0.06)', backgroundColor: 'rgba(45, 212, 191, 0.08)' }}
      >
        <History size={compact ? 16 : 18} style={{ color: '#0F766E' }} />
        <div className="min-w-0 flex-1">
          <p className={`font-semibold m-0 ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: '#1A202C' }}>
            Lịch sử riêng tư
          </p>
          <p className="text-[11px] opacity-60 m-0 truncate flex items-center gap-1" style={{ color: '#1A202C' }}>
            <Lock size={10} className="shrink-0" />
            {userName || 'Tài khoản'}
            {userEmail ? ` · ${userEmail}` : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {historyLoading ? (
          <p className="text-xs text-center py-6 opacity-50 m-0" style={{ color: '#1A202C' }}>
            Đang tải lịch sử…
          </p>
        ) : messageCount === 0 ? (
          <p className="text-xs text-center py-6 opacity-50 m-0 px-2 leading-relaxed" style={{ color: '#1A202C' }}>
            Chưa có hội thoại đã lưu. Mỗi tài khoản có lịch sử riêng — không chia sẻ với người khác.
          </p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3">
            {dayTurnGroups.map((group) => (
              <li key={group.dateKey}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1.5 m-0 opacity-45"
                  style={{ color: '#1A202C' }}
                >
                  {group.label}
                </p>
                <ul className="m-0 p-0 list-none space-y-0.5">
                  {group.turns.map((turn) => (
                    <li key={turn.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onScrollTo(turn.user.id)}
                        className="w-full text-left rounded-xl px-2.5 py-2 pr-9 text-xs border-0 cursor-pointer transition-colors hover:bg-teal-50/80 flex items-start gap-1.5"
                        style={{ color: '#1A202C', backgroundColor: 'transparent' }}
                      >
                        <ChevronRight size={14} className="shrink-0 mt-0.5 opacity-35" />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold block opacity-70" style={{ color: '#0F766E' }}>
                            Đoạn chat · {formatTime(turn.ts)}
                            {turn.replies.length > 0 && (
                              <span className="font-normal opacity-60"> · {turn.replies.length + 1} tin</span>
                            )}
                          </span>
                          <span className="block opacity-80 leading-snug mt-0.5">{turnPreview(turn)}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Xóa đoạn này khỏi tài khoản"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTurn(turn.id);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border-0 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-50"
                        style={{ color: '#B91C1C' }}
                        aria-label="Xóa đoạn hội thoại"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p
        className="text-[10px] text-center px-3 py-2 m-0 border-t opacity-45 shrink-0"
        style={{ borderColor: 'rgba(26,32,44,0.06)', color: '#64748B' }}
      >
        {turnCount} đoạn · {messageCount} tin · chỉ tài khoản của bạn
      </p>
    </>
  );
}
