import { ChevronRight, History, Plus, Trash2 } from 'lucide-react';
import type { ChatDayTurnGroup } from '../lib/aiChatHistory';
import { turnPreview } from '../lib/aiChatHistory';

type Props = {
  dayTurnGroups: ChatDayTurnGroup[];
  historyLoading: boolean;
  messageCount: number;
  compact?: boolean;
  activeTurnId?: string | null;
  onScrollTo: (messageId: string, turnId: string) => void;
  onDeleteTurn: (turnId: string) => void;
  onNewChat?: () => void;
};

export function ChatHistoryPanel({
  dayTurnGroups,
  historyLoading,
  messageCount,
  compact = false,
  activeTurnId,
  onScrollTo,
  onDeleteTurn,
  onNewChat,
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
        {onNewChat && !compact && (
          <button
            type="button"
            onClick={onNewChat}
            title="Bắt đầu cuộc trò chuyện mới"
            className="p-1.5 rounded-lg border-0 cursor-pointer transition-colors hover:bg-teal-100"
            style={{ color: '#0F766E' }}
            aria-label="Chat mới"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {historyLoading ? (
          <div className="space-y-2 px-1 py-3">
            {[72, 88, 60, 80].map((w) => (
              <div key={w} className="h-8 rounded-lg animate-pulse" style={{ width: `${w}%`, backgroundColor: 'rgba(45, 212, 191, 0.12)' }} />
            ))}
          </div>
        ) : messageCount === 0 ? (
          <p className="text-xs text-center py-6 opacity-40 m-0 leading-relaxed" style={{ color: '#1A202C' }}>
            Chưa có lịch sử.{'\n'}Bắt đầu hỏi Tezca AI!
          </p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3">
            {dayTurnGroups.map((group) => (
              <li key={group.dateKey}>
                <p
                  className={`m-0 px-2 pb-1 font-semibold uppercase tracking-wide ${compact ? 'text-[9px]' : 'text-[10px]'}`}
                  style={{ color: '#0F766E' }}
                >
                  {group.label}
                </p>
                <ul className="m-0 p-0 list-none space-y-0.5">
                  {group.turns.map((turn) => {
                    const isActive = activeTurnId === turn.id;
                    return (
                      <li key={turn.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => onScrollTo(turn.user.id, turn.id)}
                          className="w-full text-left rounded-xl px-2.5 py-2 pr-9 text-xs border-0 cursor-pointer transition-all flex items-start gap-1.5"
                          style={{
                            color: isActive ? '#0F766E' : '#1A202C',
                            backgroundColor: isActive ? 'rgba(45, 212, 191, 0.14)' : 'transparent',
                            fontWeight: isActive ? 600 : 400,
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(45, 212, 191, 0.07)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          <ChevronRight
                            size={14}
                            className={`shrink-0 mt-0.5 transition-transform ${isActive ? 'rotate-90' : ''}`}
                            style={{ opacity: isActive ? 0.8 : 0.35 }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block leading-snug line-clamp-2">{turnPreview(turn)}</span>
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
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
