import { Heart, MessageCircle, Flag, Send, Share2, MoreHorizontal, UserPlus, UserCheck } from 'lucide-react';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { postTopicLabel, roleBadgeLabel, type CommunityPostTopic } from '../../lib/communityTopics';

export type ForumPost = {
  id: string;
  userId?: string;
  authorName: string;
  authorRole: string;
  topic: CommunityPostTopic;
  content: string;
  imageUrl?: string;
  likesCount: number;
  likedByMe: boolean;
  commentCount: number;
  threadReplyCount?: number;
  parentPostId?: string | null;
  createdAt: number;
};

export type ForumComment = {
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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

type PostCardProps = {
  post: ForumPost;
  currentUserId?: string;
  isFollowingAuthor?: boolean;
  onToggleFollowAuthor?: (userId: string) => void;
  expanded: boolean;
  comments: ForumComment[];
  threadReplies: ForumPost[];
  commentDraft: string;
  threadReplyDraft: string;
  onToggleLike: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onReport: (postId: string) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  onThreadReplyDraftChange: (postId: string, value: string) => void;
  onSubmitComment: (postId: string) => void;
  onSubmitThreadReply: (postId: string) => void;
};

function replyCount(post: ForumPost) {
  return (post.commentCount || 0) + (post.threadReplyCount || 0);
}

export function PostCard({
  post,
  currentUserId,
  isFollowingAuthor,
  onToggleFollowAuthor,
  expanded,
  comments,
  threadReplies,
  commentDraft,
  threadReplyDraft,
  onToggleLike,
  onToggleComments,
  onReport,
  onCommentDraftChange,
  onThreadReplyDraftChange,
  onSubmitComment,
  onSubmitThreadReply,
}: PostCardProps) {
  const sharePost = async () => {
    const url = `${window.location.origin}/cong-dong/dien-dan?post=${encodeURIComponent(post.id)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  return (
    <li className="rounded-2xl border shadow-sm overflow-hidden" style={tezcaCardStyle}>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
            >
              {initials(post.authorName)}
            </div>
            <div>
              <p className="m-0 font-semibold text-sm">{post.authorName}</p>
              <p className="m-0 text-xs opacity-60 mt-0.5">
                {roleBadgeLabel(post.authorRole)} · {postTopicLabel(post.topic)} · {formatTime(post.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {post.userId && post.userId !== currentUserId && onToggleFollowAuthor && (
              <button
                type="button"
                onClick={() => onToggleFollowAuthor(post.userId!)}
                className="inline-flex items-center gap-1 text-xs border rounded-full px-2 py-1 cursor-pointer"
                style={{
                  borderColor: tezcaTheme.border,
                  color: isFollowingAuthor ? tezcaTheme.accentDark : tezcaTheme.textMuted,
                }}
              >
                {isFollowingAuthor ? <UserCheck size={14} /> : <UserPlus size={14} />}
                <span className="hidden sm:inline">{isFollowingAuthor ? 'Đang theo dõi' : 'Theo dõi'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onReport(post.id)}
              className="inline-flex items-center justify-center border-0 bg-transparent cursor-pointer p-1 opacity-50 hover:opacity-100"
              aria-label="Báo cáo bài viết"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
        <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.imageUrl?.trim() && (
        <img
          src={post.imageUrl.trim()}
          alt=""
          className="w-full object-cover max-h-[400px]"
          loading="lazy"
        />
      )}

      <div className="flex flex-wrap gap-4 px-4 py-3 border-t" style={{ borderColor: tezcaTheme.border }}>
        <button
          type="button"
          onClick={() => onToggleLike(post.id)}
          className="inline-flex items-center gap-1.5 text-sm border-0 bg-transparent cursor-pointer p-0 group"
          style={{ color: post.likedByMe ? tezcaTheme.accentDark : tezcaTheme.textMuted }}
        >
          <Heart size={18} fill={post.likedByMe ? 'currentColor' : 'none'} className="group-hover:opacity-80" />
          <span>{post.likesCount}</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleComments(post.id)}
          className="inline-flex items-center gap-1.5 text-sm border-0 bg-transparent cursor-pointer p-0 opacity-70 hover:opacity-100"
        >
          <MessageCircle size={18} />
          <span>{replyCount(post)}</span>
        </button>
        <button
          type="button"
          onClick={sharePost}
          className="inline-flex items-center gap-1.5 text-sm border-0 bg-transparent cursor-pointer p-0 opacity-70 hover:opacity-100"
        >
          <Share2 size={18} />
          <span>Chia sẻ</span>
        </button>
        <button
          type="button"
          onClick={() => onReport(post.id)}
          className="inline-flex items-center gap-1.5 text-sm border-0 bg-transparent cursor-pointer p-0 opacity-50 ml-auto"
        >
          <Flag size={14} />
          <span className="hidden sm:inline">Báo cáo</span>
        </button>
      </div>
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: tezcaTheme.border }}>
          {threadReplies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-xl px-3 py-2 border-l-2 ml-2"
              style={{ borderColor: tezcaTheme.accentDark, backgroundColor: tezcaTheme.subtleBg }}
            >
              <p className="m-0 text-xs font-medium">
                {reply.authorName}{' '}
                <span className="opacity-50">· {roleBadgeLabel(reply.authorRole)}</span>
              </p>
              <p className="m-0 text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={threadReplyDraft}
              onChange={(e) => onThreadReplyDraftChange(post.id, e.target.value)}
              placeholder="Phản hồi trong luồng…"
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: tezcaTheme.border }}
            />
            <button
              type="button"
              onClick={() => onSubmitThreadReply(post.id)}
              className="shrink-0 rounded-xl px-3 border-0 cursor-pointer"
              style={{ background: tezcaTheme.accentGradient }}
              aria-label="Gửi phản hồi"
            >
              <Send size={18} />
            </button>
          </div>
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: tezcaTheme.subtleBg }}
            >
              <p className="m-0 text-xs font-medium">
                {c.authorName}{' '}
                <span className="opacity-50">· {roleBadgeLabel(c.authorRole)}</span>
              </p>
              <p className="m-0 text-sm mt-1">{c.content}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={commentDraft}
              onChange={(e) => onCommentDraftChange(post.id, e.target.value)}
              placeholder="Viết bình luận…"
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: tezcaTheme.border }}
            />
            <button
              type="button"
              onClick={() => onSubmitComment(post.id)}
              className="shrink-0 rounded-xl px-3 border-0 cursor-pointer"
              style={{ background: tezcaTheme.accentGradient }}
              aria-label="Gửi bình luận"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
