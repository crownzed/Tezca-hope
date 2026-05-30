import { Bell, MessagesSquare } from 'lucide-react';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { POST_TOPICS, type CommunityPostTopic } from '../../lib/communityTopics';
import { EmptyState } from '../tezca/EmptyState';
import { CommunityCreatePost } from './CommunityCreatePost';
import { CommunityFeedTabs } from './CommunityFeedTabs';
import { PostCard, type ForumComment, type ForumPost } from './PostCard';
import type { CommunityFeedMode } from '../../lib/communityFeed';

type ForumFeedProps = {
  authorName: string;
  feedMode: CommunityFeedMode;
  onFeedModeChange: (mode: CommunityFeedMode) => void;
  posts: ForumPost[];
  loading: boolean;
  topicFilter: CommunityPostTopic | '';
  newPostTopic: CommunityPostTopic;
  newPostContent: string;
  newPostImageUrl: string;
  postBusy: boolean;
  expandedPost: string | null;
  comments: Record<string, ForumComment[]>;
  commentDraft: Record<string, string>;
  threadReplies: Record<string, ForumPost[]>;
  threadReplyDraft: Record<string, string>;
  followedTopics: Set<CommunityPostTopic>;
  followedUserIds: Set<string>;
  currentUserId?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onTopicFilterChange: (topic: CommunityPostTopic | '') => void;
  onToggleTopicFollow: (topic: CommunityPostTopic) => void;
  onToggleFollowAuthor: (userId: string) => void;
  onLoadMore: () => void;
  onNewPostTopicChange: (topic: CommunityPostTopic) => void;
  onNewPostContentChange: (content: string) => void;
  onNewPostImageUrlChange: (url: string) => void;
  onSubmitPost: () => void;
  onRefresh: () => void;
  onToggleLike: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onReport: (postId: string) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  onThreadReplyDraftChange: (postId: string, value: string) => void;
  onSubmitComment: (postId: string) => void;
  onSubmitThreadReply: (postId: string) => void;
};

export function ForumFeed({
  authorName,
  feedMode,
  onFeedModeChange,
  posts,
  loading,
  topicFilter,
  newPostTopic,
  newPostContent,
  newPostImageUrl,
  postBusy,
  expandedPost,
  comments,
  commentDraft,
  onTopicFilterChange,
  onNewPostTopicChange,
  onNewPostContentChange,
  onNewPostImageUrlChange,
  onSubmitPost,
  onRefresh,
  onToggleLike,
  onToggleComments,
  onReport,
  threadReplies,
  threadReplyDraft,
  followedTopics,
  followedUserIds,
  currentUserId,
  hasMore,
  loadingMore,
  onToggleTopicFollow,
  onToggleFollowAuthor,
  onLoadMore,
  onCommentDraftChange,
  onThreadReplyDraftChange,
  onSubmitComment,
  onSubmitThreadReply,
}: ForumFeedProps) {
  return (
    <>
      <CommunityFeedTabs mode={feedMode} onModeChange={onFeedModeChange} />
      <CommunityCreatePost
        authorName={authorName}
        topic={newPostTopic}
        content={newPostContent}
        imageUrl={newPostImageUrl}
        busy={postBusy}
        onTopicChange={onNewPostTopicChange}
        onContentChange={onNewPostContentChange}
        onImageUrlChange={onNewPostImageUrlChange}
        onSubmit={onSubmitPost}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTopicFilterChange('')}
          className="text-xs px-3 py-1.5 rounded-full border cursor-pointer"
          style={
            !topicFilter
              ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
              : { borderColor: tezcaTheme.border }
          }
        >
          Tất cả
        </button>
        {POST_TOPICS.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onTopicFilterChange(t.id)}
              className="text-xs px-3 py-1.5 rounded-full border cursor-pointer"
              style={
                topicFilter === t.id
                  ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                  : { borderColor: tezcaTheme.border }
              }
            >
              {t.label}
            </button>
            <button
              type="button"
              onClick={() => onToggleTopicFollow(t.id)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border cursor-pointer"
              style={{
                borderColor: tezcaTheme.border,
                color: followedTopics.has(t.id) ? tezcaTheme.accentDark : tezcaTheme.textMuted,
              }}
              aria-label={followedTopics.has(t.id) ? `Bỏ theo dõi ${t.label}` : `Theo dõi ${t.label}`}
              title={followedTopics.has(t.id) ? 'Đang theo dõi' : 'Theo dõi chủ đề'}
            >
              <Bell size={14} fill={followedTopics.has(t.id) ? 'currentColor' : 'none'} />
            </button>
          </span>
        ))}
      </div>

      {loading && <p className="text-sm opacity-60">Đang tải…</p>}

      {!loading && posts.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title="Chưa có bài viết"
          description="Hãy là người đầu tiên chia sẻ trải nghiệm trong chủ đề này."
          actionLabel="Làm mới"
          onAction={onRefresh}
        />
      )}

      <ul className="space-y-4 list-none m-0 p-0">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            isFollowingAuthor={post.userId ? followedUserIds.has(post.userId) : false}
            onToggleFollowAuthor={onToggleFollowAuthor}
            expanded={expandedPost === post.id}
            comments={comments[post.id] || []}
            threadReplies={threadReplies[post.id] || []}
            commentDraft={commentDraft[post.id] || ''}
            threadReplyDraft={threadReplyDraft[post.id] || ''}
            onToggleLike={onToggleLike}
            onToggleComments={onToggleComments}
            onReport={onReport}
            onCommentDraftChange={onCommentDraftChange}
            onThreadReplyDraftChange={onThreadReplyDraftChange}
            onSubmitComment={onSubmitComment}
            onSubmitThreadReply={onSubmitThreadReply}
          />
        ))}
      </ul>

      {hasMore && !loading && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full rounded-xl border py-2.5 text-sm cursor-pointer disabled:opacity-50"
          style={{ borderColor: tezcaTheme.border }}
        >
          {loadingMore ? 'Đang tải thêm…' : 'Xem thêm bài viết'}
        </button>
      )}
    </>
  );
}
