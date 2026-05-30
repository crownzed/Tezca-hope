import { Activity, TrendingUp } from 'lucide-react';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { postTopicLabel, type CommunityPostTopic } from '../../lib/communityTopics';
import type { ForumPost } from './PostCard';

type TopicStat = { id: CommunityPostTopic; label: string; count: number };

type CommunityRightAsideProps = {
  posts: ForumPost[];
  topicStat: TopicStat[];
  onTopicSelect: (topic: CommunityPostTopic) => void;
};

export function CommunityRightAside({ posts, topicStat, onTopicSelect }: CommunityRightAsideProps) {
  const latestPosts = posts.slice(0, 5);
  const trending = [...topicStat].sort((a, b) => b.count - a.count).filter((t) => t.count > 0);

  return (
    <aside
      className="hidden xl:flex flex-col w-72 shrink-0 sticky top-28 self-start rounded-2xl border p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)]"
      style={tezcaCardStyle}
      aria-label="Thông tin cộng đồng"
    >
      <div>
        <p className="text-sm font-semibold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
          <TrendingUp size={16} aria-hidden />
          Chủ đề nổi bật
        </p>
        <div className="mt-3 space-y-1">
          {trending.length === 0 && (
            <p className="text-xs opacity-60 m-0">Chưa có chủ đề nào có bài viết.</p>
          )}
          {trending.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => onTopicSelect(topic.id)}
              className="w-full text-left rounded-xl px-3 py-2 border-0 cursor-pointer transition-colors hover:opacity-90"
              style={{ backgroundColor: tezcaTheme.subtleBg }}
            >
              <p className="m-0 text-sm font-medium" style={{ color: tezcaTheme.accentDark }}>
                {topic.label}
              </p>
              <p className="m-0 text-xs opacity-60 mt-0.5">{topic.count} bài viết</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: tezcaTheme.border }}>
        <p className="text-sm font-semibold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
          <Activity size={16} aria-hidden />
          Hoạt động mới
        </p>
        <div className="mt-3 space-y-2">
          {latestPosts.length === 0 && <p className="text-xs opacity-60 m-0">Chưa có hoạt động.</p>}
          {latestPosts.map((post) => (
            <div
              key={post.id}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: tezcaTheme.subtleBg }}
            >
              <p className="m-0 text-xs font-medium">{post.authorName}</p>
              <p className="m-0 text-xs opacity-70 mt-1 line-clamp-2">{post.content}</p>
              <p className="m-0 text-[10px] opacity-50 mt-1">{postTopicLabel(post.topic)}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
