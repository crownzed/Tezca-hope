import { ChevronRight, History, Trash2 } from 'lucide-react';
import type { ChatDayTurnGroup } from '../lib/aiChatHistory';
import { turnPreview } from '../lib/aiChatHistory';

type Props = {
  dayTurnGroups: ChatDayTurnGroup[];
  historyLoading: boolean;
  messageCount: number;
  compact?: boolean;
  onScrollTo: (messageId: string) => void;
  onDeleteTurn: (turnId: string) => void;
};

export function ChatHistoryPanel({
  dayTurnGroups,
  historyLoading,
  messageCount,
  compact = false,
  onScrollTo,
  onDeleteTurn,
}: Props) {
  return (
    <>
      <div
        className={`border-b flex items-center gap-2 shrink-0 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
        style={{ borderColor: 'rgba(26, 32, 44, 0.06)', backgroundColor: 'rgba(45, 212, 191, 0.08)' }}
      >
        <History size={compact ? 16 : 18} style={{ color: '#0F766E' }} />
        <p className={`font-semibold m-0 flex-1 ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: '#1A202C' }}>
          Lịch sử
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {historyLoading ? (
          <p className="text-xs text-center py-6 opacity-50 m-0" style={{ color: '#1A202C' }}>
            Đang tải lịch sử…
          </p>
        ) : messageCount === 0 ? null : (
          <ul className="m-0 p-0 list-none space-y-3">
            {dayTurnGroups.map((group) => (
              <li key={group.dateKey}>
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
                          <span className="block leading-snug">{turnPreview(turn)}</span>
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

    </>
  );
}
