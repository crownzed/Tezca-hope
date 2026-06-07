import { useEffect, useMemo, useRef } from 'react';
import { Hash, Loader2, SendHorizontal, Users } from 'lucide-react';
import { ChatMentionInput, type MentionCandidate } from './ChatMentionInput';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { ROOM_TOPICS, roleBadgeLabel, type CommunityRoomTopic } from '../../lib/communityTopics';
import { canUseWebSocket } from '../../lib/api';
import { renderCommunityMessageContent } from '../../lib/communityMessageContent';
import type { RoomPresenceMember } from '../../hooks/useCommunityRoomChannel';

export type RoomChatMessage = {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: number;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayKey(ts: number) {
  return new Date(ts).toLocaleDateString('sv-SE');
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

type GroupChatBoxProps = {
  currentUserName: string;
  roomTopic: CommunityRoomTopic;
  messages: RoomChatMessage[];
  loading?: boolean;
  draft: string;
  unreadByTopic: Record<CommunityRoomTopic, boolean>;
  onlineMembers?: RoomPresenceMember[];
  typingText?: string;
  onRoomTopicChange: (topic: CommunityRoomTopic) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  fetchMentionCandidates: (query: string) => Promise<MentionCandidate[]>;
};

export function GroupChatBox({
  currentUserName,
  roomTopic,
  messages,
  loading = false,
  draft,
  unreadByTopic,
  onlineMembers = [],
  typingText = '',
  onRoomTopicChange,
  onDraftChange,
  onSend,
  fetchMentionCandidates,
}: GroupChatBoxProps) {
  const roomEndRef = useRef<HTMLDivElement>(null);
  const selectedTopic = ROOM_TOPICS.find((item) => item.id === roomTopic);

  const activeMembers = useMemo(() => {
    const byKey = new Map<
      string,
      { name: string; role: string; lastAt: number; online: boolean }
    >();
    for (const member of onlineMembers) {
      byKey.set(member.userId, {
        name: member.userName,
        role: member.role,
        lastAt: Date.now(),
        online: true,
      });
    }
    for (const message of messages) {
      const key = message.authorName;
      const prev = byKey.get(key);
      if (!prev || prev.lastAt < message.createdAt) {
        byKey.set(key, {
          name: message.authorName,
          role: message.authorRole,
          lastAt: message.createdAt,
          online: prev?.online ?? false,
        });
      }
    }
    const members = [...byKey.values()].sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.lastAt - a.lastAt;
    });
    const hasCurrent = members.some((item) => item.name === currentUserName);
    if (!hasCurrent) {
      members.unshift({ name: currentUserName, role: 'user', lastAt: Date.now(), online: true });
    }
    return members;
  }, [currentUserName, messages, onlineMembers]);

  useEffect(() => {
    roomEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border overflow-hidden min-h-[68vh]" style={tezcaCardStyle}>
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)_240px] min-h-[68vh]">
          <aside className="border-b lg:border-b-0 lg:border-r p-3" style={{ borderColor: tezcaTheme.border }}>
            <p className="m-0 text-xs uppercase tracking-wide opacity-60">Kênh chủ đề</p>
            <div className="mt-3 space-y-1">
              {ROOM_TOPICS.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onRoomTopicChange(room.id)}
                  className="w-full text-left rounded-lg px-3 py-2 border-0 cursor-pointer transition-opacity"
                  style={
                    roomTopic === room.id
                      ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                      : { backgroundColor: tezcaTheme.subtleBg, color: tezcaTheme.textMuted }
                  }
                >
                  <p className="m-0 text-sm font-semibold flex items-center gap-1.5">
                    <Hash size={14} />
                    {room.label}
                    {unreadByTopic[room.id] && roomTopic !== room.id && (
                      <span
                        className="inline-flex w-2 h-2 rounded-full"
                        style={{ backgroundColor: tezcaTheme.accentDark }}
                        aria-label="Có tin nhắn chưa đọc"
                      />
                    )}
                  </p>
                  <p className="m-0 text-xs opacity-75 mt-0.5 line-clamp-2">{room.description}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r" style={{ borderColor: tezcaTheme.border }}>
            <header className="px-4 py-3 border-b" style={{ borderColor: tezcaTheme.border }}>
              <p className="m-0 text-sm font-semibold flex items-center gap-2">
                <Hash size={16} />
                {selectedTopic?.label || 'Phòng chat'}
              </p>
              <p className="m-0 text-xs opacity-60 mt-0.5">
                {selectedTopic?.description || 'Trao đổi nhanh cùng cộng đồng.'}
              </p>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 size={22} className="animate-spin opacity-40" style={{ color: tezcaTheme.accentDark }} />
                  <p className="text-xs opacity-50 m-0">Đang tải tin nhắn…</p>
                </div>
              )}
              {!loading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Hash size={28} className="opacity-20" />
                  <p className="text-sm opacity-50 text-center m-0">
                    Chưa có tin nhắn — hãy chào cộng đồng!
                  </p>
                </div>
              )}
              {!loading && (() => {
                const rows: { type: 'day'; key: string; label: string } | { type: 'msg'; message: RoomChatMessage }[] = [];
                let lastDay = '';
                for (const m of messages) {
                  const dk = dayKey(m.createdAt);
                  if (dk !== lastDay) {
                    lastDay = dk;
                    rows.push({ type: 'day', key: dk, label: dayLabel(m.createdAt) });
                  }
                  rows.push({ type: 'msg', message: m });
                }
                return rows.map((row) => {
                  if (row.type === 'day') {
                    return (
                      <div key={`day-${row.key}`} className="flex justify-center py-3">
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
                  const isMine = m.authorName === currentUserName;
                  return (
                    <div key={m.id} className={`rounded-xl px-3 py-2 ${isMine ? 'ml-4' : ''}`} style={{ backgroundColor: isMine ? 'rgba(45, 212, 191, 0.1)' : tezcaTheme.subtleBg }}>
                      <p className="m-0 text-xs font-semibold" style={{ color: isMine ? tezcaTheme.accentDark : tezcaTheme.text }}>
                        {m.authorName}{' '}
                        <span className="font-normal opacity-50">
                          · {roleBadgeLabel(m.authorRole)} · {formatTime(m.createdAt)}
                        </span>
                      </p>
                      <p className="m-0 text-sm mt-0.5 whitespace-pre-wrap leading-relaxed">
                        {renderCommunityMessageContent(m.content)}
                      </p>
                    </div>
                  );
                });
              })()}
              <div ref={roomEndRef} />
            </div>

            {typingText && (
              <p className="m-0 px-4 text-xs opacity-60 animate-pulse">{typingText}</p>
            )}

            <div className="border-t p-3 flex gap-2" style={{ borderColor: tezcaTheme.border }}>
              <ChatMentionInput
                value={draft}
                onChange={onDraftChange}
                onSend={onSend}
                fetchCandidates={fetchMentionCandidates}
                placeholder={`Nhắn #${selectedTopic?.label?.toLowerCase() || 'phong-chat'}…`}
              />
              <button
                type="button"
                onClick={onSend}
                className="rounded-xl px-3 py-2 text-sm font-semibold border-0 cursor-pointer inline-flex items-center gap-1.5"
                style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
              >
                <SendHorizontal size={16} />
                Gửi
              </button>
            </div>
            <p className="m-0 px-4 pb-2 text-xs opacity-50">
              Nhấn Enter để gửi · Gõ @tên để nhắc thành viên trong phòng.
            </p>
          </section>

          <aside className="p-3 min-h-0">
            <p className="m-0 text-xs uppercase tracking-wide opacity-60 flex items-center gap-1.5">
              <Users size={14} />
              Trực tuyến ({onlineMembers.length || activeMembers.filter((m) => m.online).length})
            </p>
            <div className="mt-3 space-y-1 max-h-[52vh] overflow-y-auto pr-1">
              {activeMembers.map((member) => (
                <div key={`${member.name}-${member.role}`} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: tezcaTheme.subtleBg }}>
                  <p className="m-0 text-sm font-medium flex items-center gap-2">
                    {member.online && (
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: '#22c55e' }}
                        aria-hidden
                      />
                    )}
                    {member.name}
                  </p>
                  <p className="m-0 text-xs opacity-60">{roleBadgeLabel(member.role)}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
      <p className="text-xs opacity-50 m-0">
        {canUseWebSocket()
          ? 'Tin nhắn được cập nhật theo thời gian thực qua WebSocket.'
          : 'Tin nhắn được làm mới tự động mỗi 5 giây. Vui lòng tôn trọng cộng đồng và không chia sẻ thông tin y tế nhạy cảm.'}
      </p>
    </div>
  );
}
