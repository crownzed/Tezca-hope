import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { communityShell } from '../../lib/communityShellTheme';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { postTopicLabel, roleBadgeLabel, type CommunityPostTopic } from '../../lib/communityTopics';

export type ForumPost = {
  id: string;
  userId?: string;
  authorName: string;
  authorRole: string;
  authorSpecialty?: string;
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
  authorSpecialty?: string;
  content: string;
  createdAt: number;
};

function formatTime(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
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
  onDelete?: (postId: string) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  onThreadReplyDraftChange: (postId: string, value: string) => void;
  onSubmitComment: (postId: string) => Promise<void> | void;
  onSubmitThreadReply: (postId: string) => Promise<void> | void;
};

function replyCount(post: ForumPost) {
  return (post.commentCount || 0) + (post.threadReplyCount || 0);
}

/** Heart icon with a scale-bounce CSS animation on click */
function LikeButton({
  liked,
  count,
  onClick,
}: {
  liked: boolean;
  count: number;
  onClick: () => void;
}) {
  const [burst, setBurst] = useState(false);

  const handleClick = () => {
    if (!liked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm border-0 bg-transparent cursor-pointer p-0 select-none"
      style={{ color: liked ? '#E53E3E' : tezcaTheme.textMuted }}
      aria-label={liked ? 'Bỏ thích bài viết' : 'Thích bài viết'}
    >
      <span
        style={{
          display: 'inline-flex',
          transform: burst ? 'scale(1.45)' : 'scale(1)',
          transition: burst ? 'transform 0.15s cubic-bezier(.36,2,.2,1)' : 'transform 0.2s ease',
        }}
      >
        <Heart
          size={18}
          fill={liked ? 'currentColor' : 'none'}
          strokeWidth={liked ? 0 : 2}
        />
      </span>
      <span
        style={{
          fontWeight: liked ? 600 : 400,
          transition: 'color 0.2s',
        }}
      >
        {count}
      </span>
    </button>
  );
}

/** Share button — uses Web Share API on mobile, clipboard fallback on desktop */
function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const url = `${window.location.origin}/cong-dong/dien-dan?post=${encodeURIComponent(postId)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2200);
  };

  const nativeShare = async () => {
    setOpen(false);
    try {
      await navigator.share({ title: 'Tezca Cộng đồng', url });
    } catch {
      /* user cancelled or not supported */
    }
  };

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          if (copied) return;
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-1.5 text-sm border-0 bg-transparent cursor-pointer p-0"
        style={{ color: copied ? tezcaTheme.accentDark : tezcaTheme.textMuted }}
        aria-label="Chia sẻ bài viết"
      >
        {copied ? <Check size={16} strokeWidth={2.5} /> : <Share2 size={18} />}
        <span>{copied ? 'Đã sao chép!' : 'Chia sẻ'}</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 rounded-xl border shadow-lg overflow-hidden z-20 min-w-[160px]"
          style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
        >
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left border-0 bg-transparent cursor-pointer hover:bg-slate-50"
            style={{ color: tezcaTheme.text }}
          >
            <Link2 size={15} />
            Sao chép liên kết
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={() => void nativeShare()}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left border-0 bg-transparent cursor-pointer hover:bg-slate-50 border-t"
              style={{ color: tezcaTheme.text, borderColor: tezcaTheme.border }}
            >
              <Share2 size={15} />
              Chia sẻ qua ứng dụng
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Dropdown action menu (delete own post / report) */
function PostMenu({
  isOwn,
  onReport,
  onDelete,
}: {
  isOwn: boolean;
  onReport: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center border-0 bg-transparent cursor-pointer p-1 rounded-lg opacity-50 hover:opacity-100"
        aria-label="Tùy chọn bài viết"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 right-0 rounded-xl border shadow-lg overflow-hidden z-20 min-w-[160px]"
          style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
        >
          {isOwn && onDelete && (
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left border-0 bg-transparent cursor-pointer hover:bg-slate-50"
              style={{ color: '#E53E3E' }}
            >
              <Trash2 size={14} />
              Xóa bài viết
            </button>
          )}
          {!isOwn && (
            <button
              type="button"
              onClick={() => { setOpen(false); onReport(); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left border-0 bg-transparent cursor-pointer hover:bg-slate-50"
              style={{ color: '#E53E3E' }}
            >
              <Flag size={14} />
              Báo cáo bài viết
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Comment input — Enter submits, Shift+Enter = newline */
function CommentInput({
  value,
  placeholder,
  submitting,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  submitting: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !submitting) onSubmit();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={value}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
        style={{
          borderColor: tezcaTheme.border,
          minHeight: 38,
          maxHeight: 120,
          overflowY: 'auto',
        }}
        disabled={submitting}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim() || submitting}
        className="shrink-0 rounded-xl px-3 py-2 border-0 cursor-pointer disabled:opacity-40 flex items-center justify-center"
        style={{ background: tezcaTheme.accentGradient, height: 38 }}
        aria-label="Gửi"
      >
        {submitting ? (
          <span
            className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
            aria-hidden
          />
        ) : (
          <Send size={16} style={{ color: '#fff' }} />
        )}
      </button>
    </div>
  );
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
  onDelete,
  onCommentDraftChange,
  onThreadReplyDraftChange,
  onSubmitComment,
  onSubmitThreadReply,
}: PostCardProps) {
  /* Local submitting states to show loading spinners */
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showThreadReplies, setShowThreadReplies] = useState(true);

  const handleSubmitComment = async () => {
    if (!commentDraft.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await onSubmitComment(post.id);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!threadReplyDraft.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      await onSubmitThreadReply(post.id);
    } finally {
      setSubmittingReply(false);
    }
  };

  const totalCount = replyCount(post);

  return (
    <li
      id={`post-${post.id}`}
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: communityShell.cardBg,
        borderColor: communityShell.cardBorder,
        boxShadow: communityShell.cardShadow,
      }}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 select-none"
              style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
              aria-hidden
            >
              {initials(post.authorName)}
            </div>
            <div className="min-w-0">
              <p className="m-0 font-semibold text-[15px] leading-tight truncate">{post.authorName}</p>
              <p className="m-0 text-xs mt-0.5" style={{ color: communityShell.navText }}>
                {formatTime(post.createdAt)}
                <span className="mx-1">·</span>
                <span style={{ color: post.authorRole === 'expert' ? tezcaTheme.accentDark : undefined }}>
                  {roleBadgeLabel(post.authorRole, post.authorSpecialty)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {post.userId && post.userId !== currentUserId && onToggleFollowAuthor && (
              <button
                type="button"
                onClick={() => onToggleFollowAuthor(post.userId!)}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1 cursor-pointer border-0"
                style={{
                  backgroundColor: isFollowingAuthor ? communityShell.inputBg : communityShell.followBtn,
                  color: isFollowingAuthor ? communityShell.navText : '#fff',
                }}
                aria-label={isFollowingAuthor ? 'Bỏ theo dõi' : 'Theo dõi tác giả'}
              >
                {isFollowingAuthor ? <UserCheck size={13} /> : <UserPlus size={13} />}
                {isFollowingAuthor ? 'Đã theo dõi' : 'Theo dõi'}
              </button>
            )}
            <PostMenu
              isOwn={Boolean(currentUserId && post.userId === currentUserId)}
              onReport={() => onReport(post.id)}
              onDelete={onDelete ? () => onDelete(post.id) : undefined}
            />
          </div>
        </div>

        <p
          className="m-0 mt-3 text-[15px] leading-relaxed whitespace-pre-wrap"
          style={{ color: tezcaTheme.text }}
        >
          {post.content}
        </p>
        <p className="m-0 mt-2 text-[11px] font-medium" style={{ color: communityShell.hashtag }}>
          #{postTopicLabel(post.topic).replace(/\s+/g, '')}
        </p>
      </div>

      {post.imageUrl?.trim() && (
        <img
          src={post.imageUrl.trim()}
          alt=""
          className="w-full object-cover max-h-[420px] border-t border-b"
          loading="lazy"
          style={{ display: 'block', borderColor: communityShell.cardBorder }}
        />
      )}

      {/* Action bar */}
      <div
        className="flex flex-wrap items-center gap-4 px-4 py-3 border-t"
        style={{ borderColor: communityShell.cardBorder }}
      >
        <LikeButton
          liked={post.likedByMe}
          count={post.likesCount}
          onClick={() => onToggleLike(post.id)}
        />

        <button
          type="button"
          onClick={() => onToggleComments(post.id)}
          className="inline-flex items-center gap-1.5 text-sm border-0 bg-transparent cursor-pointer p-0 transition-colors"
          style={{ color: expanded ? tezcaTheme.accentDark : tezcaTheme.textMuted }}
          aria-label={expanded ? 'Ẩn bình luận' : 'Xem bình luận'}
          aria-expanded={expanded}
        >
          <MessageCircle size={18} fill={expanded ? 'currentColor' : 'none'} fillOpacity={0.15} />
          <span>{totalCount > 0 ? totalCount : 'Bình luận'}</span>
        </button>

        <ShareButton postId={post.id} />
      </div>

      {/* Expanded comment section */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: tezcaTheme.border }}>
          {/* Thread replies section */}
          {threadReplies.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowThreadReplies((s) => !s)}
                className="inline-flex items-center gap-1 text-xs font-semibold border-0 bg-transparent cursor-pointer p-0 opacity-70 hover:opacity-100"
                style={{ color: tezcaTheme.accentDark }}
              >
                {showThreadReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {threadReplies.length} phản hồi trong luồng
              </button>
              {showThreadReplies && (
                <div className="space-y-2 pl-2 border-l-2" style={{ borderColor: 'rgba(45,212,191,0.3)' }}>
                  {threadReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-xl px-3 py-2"
                      style={{ backgroundColor: tezcaTheme.subtleBg }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="m-0 text-xs font-semibold" style={{ color: tezcaTheme.text }}>
                          {reply.authorName}
                          {reply.authorRole === 'expert' && (
                            <span
                              className="ml-1 text-xs font-medium"
                              style={{ color: tezcaTheme.accentDark }}
                            >
                              · {roleBadgeLabel(reply.authorRole, reply.authorSpecialty)}
                            </span>
                          )}
                        </p>
                        <span className="text-xs opacity-50 shrink-0">{formatTime(reply.createdAt)}</span>
                      </div>
                      <p className="m-0 text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Thread reply input */}
          <div>
            <p className="text-xs font-semibold mb-1.5 opacity-60 m-0" style={{ color: tezcaTheme.text }}>
              Phản hồi trong luồng
            </p>
            <CommentInput
              value={threadReplyDraft}
              placeholder="Phản hồi trong luồng… (Enter để gửi)"
              submitting={submittingReply}
              onChange={(v) => onThreadReplyDraftChange(post.id, v)}
              onSubmit={() => void handleSubmitReply()}
            />
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: tezcaTheme.border }} />

          {/* Comments section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold opacity-60 m-0" style={{ color: tezcaTheme.text }}>
              Bình luận{comments.length > 0 ? ` (${comments.length})` : ''}
            </p>

            {comments.length === 0 && !submittingComment && (
              <p className="text-xs opacity-50 m-0 italic" style={{ color: tezcaTheme.textMuted }}>
                Chưa có bình luận nào. Hãy là người đầu tiên!
              </p>
            )}

            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: tezcaTheme.subtleBg }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                      style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
                      aria-hidden
                    >
                      {initials(c.authorName)}
                    </div>
                    <p className="m-0 text-xs font-semibold truncate" style={{ color: tezcaTheme.text }}>
                      {c.authorName}
                      {c.authorRole === 'expert' && (
                        <span
                          className="ml-1 font-medium"
                          style={{ color: tezcaTheme.accentDark }}
                        >
                          · {roleBadgeLabel(c.authorRole, c.authorSpecialty)}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs opacity-40 shrink-0">{formatTime(c.createdAt)}</span>
                </div>
                <p className="m-0 text-sm mt-1.5 leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <CommentInput
            value={commentDraft}
            placeholder="Viết bình luận… (Enter để gửi, Shift+Enter xuống dòng)"
            submitting={submittingComment}
            onChange={(v) => onCommentDraftChange(post.id, v)}
            onSubmit={() => void handleSubmitComment()}
          />
        </div>
      )}
    </li>
  );
}
