import { useEffect, useMemo, useState } from 'react';
import { Activity, TrendingUp, UserPlus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { communityShell } from '../../lib/communityShellTheme';
import { postTopicLabel, type CommunityPostTopic } from '../../lib/communityTopics';
import { tezcaTheme } from '../../lib/tezcaTheme';
import type { ForumPost } from './PostCard';

type TopicStat = { id: CommunityPostTopic; label: string; count: number };

type Member = { id: string; name: string; role: string };

type CommunityRightAsideProps = {
  posts: ForumPost[];
  topicStat: TopicStat[];
  onTopicSelect: (topic: CommunityPostTopic) => void;
  token: string | null;
  currentUserId?: string;
  followedUserIds: Set<string>;
  onToggleFollowAuthor?: (userId: string) => void;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

function roleSubtitle(role: string) {
  if (role === 'expert') return 'Chuyên gia Tezca';
  if (role === 'admin') return 'Quản trị';
  return 'Thành viên';
}

export function CommunityRightAside({
  posts,
  topicStat,
  onTopicSelect,
  token,
  currentUserId,
  followedUserIds,
  onToggleFollowAuthor,
}: CommunityRightAsideProps) {
  const [apiMembers, setApiMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ members: Member[] }>('/api/community/dm/members?q=', { token })
      .then((r) => setApiMembers(r.members.filter((m) => m.id !== currentUserId).slice(0, 8)))
      .catch(() => {});
  }, [token, currentUserId]);

  const suggested = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of apiMembers) map.set(m.id, m);
    for (const p of posts) {
      if (!p.userId || p.userId === currentUserId || map.has(p.userId)) continue;
      map.set(p.userId, { id: p.userId, name: p.authorName, role: p.authorRole });
    }
    return [...map.values()].slice(0, 5);
  }, [apiMembers, posts, currentUserId]);

  const trending = [...topicStat].sort((a, b) => b.count - a.count).filter((t) => t.count > 0);
  const latestPosts = posts.slice(0, 4);

  const cardStyle = {
    backgroundColor: communityShell.cardBg,
    borderColor: communityShell.cardBorder,
    boxShadow: communityShell.cardShadow,
  };

  return (
    <aside
      className="hidden xl:flex flex-col shrink-0 sticky top-6 self-start space-y-4 overflow-y-auto max-h-[calc(100vh-3rem)]"
      style={{ width: communityShell.asideWidth }}
      aria-label="Thông tin cộng đồng"
    >
      <div className="rounded-2xl border p-4" style={cardStyle}>
        <p className="text-sm font-semibold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
          <TrendingUp size={18} style={{ color: tezcaTheme.accent }} aria-hidden />
          Chủ đề nổi bật
        </p>
        <div className="mt-3 space-y-2">
          {trending.length === 0 && (
            <p className="text-xs m-0" style={{ color: communityShell.navText }}>
              Chưa có chủ đề hoạt động.
            </p>
          )}
          {trending.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => onTopicSelect(topic.id)}
              className="w-full text-left rounded-xl px-0 py-1 border-0 cursor-pointer bg-transparent hover:opacity-80"
            >
              <p className="m-0 text-sm font-semibold" style={{ color: communityShell.hashtag }}>
                #{topic.label.replace(/\s+/g, '')}
              </p>
              <p className="m-0 text-xs mt-0.5" style={{ color: communityShell.navText }}>
                {topic.count} bài viết
              </p>
            </button>
          ))}
        </div>
      </div>

      {suggested.length > 0 && onToggleFollowAuthor && (
        <div className="rounded-2xl border p-4" style={cardStyle}>
          <p className="text-sm font-semibold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
            <UserPlus size={18} style={{ color: tezcaTheme.accent }} aria-hidden />
            Gợi ý kết nối
          </p>
          <ul className="list-none m-0 p-0 mt-3 space-y-3">
            {suggested.map((member) => {
              const following = followedUserIds.has(member.id);
              return (
                <li key={member.id} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
                  >
                    {initials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-sm font-medium truncate">{member.name}</p>
                    <p className="m-0 text-[11px] truncate" style={{ color: communityShell.navText }}>
                      {roleSubtitle(member.role)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFollowAuthor(member.id)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer text-white"
                    style={{
                      backgroundColor: following ? communityShell.inputBg : communityShell.followBtn,
                      color: following ? communityShell.navText : '#fff',
                    }}
                  >
                    {following ? 'Đã theo dõi' : 'Theo dõi'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border p-4" style={cardStyle}>
        <p className="text-sm font-semibold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
          <Activity size={18} style={{ color: tezcaTheme.accent }} aria-hidden />
          Hoạt động gần đây
        </p>
        <div className="mt-3 space-y-3">
          {latestPosts.length === 0 && (
            <p className="text-xs m-0" style={{ color: communityShell.navText }}>
              Chưa có hoạt động.
            </p>
          )}
          {latestPosts.map((post) => (
            <div key={post.id} className="flex gap-2">
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: communityShell.inputBg, color: tezcaTheme.accentDark }}
              >
                {initials(post.authorName)}
              </div>
              <div className="min-w-0">
                <p className="m-0 text-xs font-medium">{post.authorName}</p>
                <p className="m-0 text-xs line-clamp-2 mt-0.5" style={{ color: communityShell.navText }}>
                  {post.content}
                </p>
                <p className="m-0 text-[10px] mt-1" style={{ color: communityShell.navText }}>
                  {postTopicLabel(post.topic)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
