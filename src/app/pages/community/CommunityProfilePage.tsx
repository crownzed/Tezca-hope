import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MessageCircle, UserPlus, UserCheck, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { postTopicLabel, roleBadgeLabel, type CommunityPostTopic } from '../../lib/communityTopics';
import { ROUTES } from '../../routes';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

type PublicProfile = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  bio: string;
  showFollowers: boolean;
  followersCount: number | null;
  followingCount: number;
  postsCount: number;
  isFollowedByMe: boolean;
  isSelf: boolean;
};

type ProfilePost = {
  id: string;
  authorName: string;
  authorRole: string;
  topic: CommunityPostTopic;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentCount: number;
  createdAt: number;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TV';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

export function CommunityProfilePage() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { token, role } = useAnyCommunitySession();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [dmBusy, setDmBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  // Chỉ khách hàng được nhắn tin trong cộng đồng
  const canDm = role === 'customer';

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [pRes, postRes] = await Promise.all([
        apiFetch<{ profile: PublicProfile }>(`/api/community/users/${encodeURIComponent(userId)}/profile`, { token }),
        apiFetch<{ posts: ProfilePost[] }>(`/api/community/users/${encodeURIComponent(userId)}/posts`, { token }),
      ]);
      setProfile(pRes.profile);
      setPosts(postRes.posts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được hồ sơ');
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleFollow = useCallback(async () => {
    if (!profile || profile.isSelf || followBusy) return;
    setFollowBusy(true);
    const next = !profile.isFollowedByMe;
    try {
      await apiFetch(`/api/community/users/${encodeURIComponent(profile.id)}/follow`, {
        method: next ? 'POST' : 'DELETE',
        token,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowedByMe: next,
              followersCount:
                prev.followersCount == null ? prev.followersCount : prev.followersCount + (next ? 1 : -1),
            }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được theo dõi');
    } finally {
      setFollowBusy(false);
    }
  }, [profile, followBusy, token]);

  const openDm = useCallback(async () => {
    if (!profile || profile.isSelf || dmBusy || !canDm) return;
    setDmBusy(true);
    try {
      await apiFetch<{ thread: { id: string } }>('/api/community/dm/threads', {
        method: 'POST',
        body: JSON.stringify({ otherUserId: profile.id }),
        token,
      });
      navigate(ROUTES.community.dm);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không mở được cuộc trò chuyện');
    } finally {
      setDmBusy(false);
    }
  }, [profile, dmBusy, canDm, token, navigate]);

  const headerInitials = useMemo(() => initials(profile?.name ?? ''), [profile?.name]);

  const toggleShowFollowers = useCallback(async () => {
    if (!profile || !profile.isSelf || settingsBusy) return;
    setSettingsBusy(true);
    const next = !profile.showFollowers;
    try {
      await apiFetch('/api/community/me/settings', {
        method: 'PUT',
        body: JSON.stringify({ showFollowers: next }),
        token,
      });
      setProfile((prev) => (prev ? { ...prev, showFollowers: next } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được cài đặt');
    } finally {
      setSettingsBusy(false);
    }
  }, [profile, settingsBusy, token]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center" style={{ color: tezcaTheme.textMuted }}>
        Đang tải hồ sơ…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm mb-4"
          style={{ color: tezcaTheme.primary }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div style={tezcaCardStyle} className="p-6 text-center">
          <p style={{ color: tezcaTheme.textMuted }}>{error || 'Không tìm thấy thành viên'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm mb-4"
        style={{ color: tezcaTheme.primary }}
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      {/* Thẻ hồ sơ */}
      <div style={tezcaCardStyle} className="p-6">
        <div className="flex items-start gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-full object-cover shrink-0"
              style={{ border: `2px solid ${tezcaTheme.border}` }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ backgroundColor: tezcaTheme.primaryLight, color: '#fff' }}
            >
              {headerInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold m-0 break-words" style={{ color: tezcaTheme.text }}>
              {profile.name}
            </h1>
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.textMuted }}
            >
              {roleBadgeLabel(profile.role)}
            </span>
            {profile.bio ? (
              <p className="text-sm mt-2 mb-0 break-words" style={{ color: tezcaTheme.text }}>
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>

        {/* Số liệu */}
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <span className="font-bold" style={{ color: tezcaTheme.text }}>{profile.postsCount}</span>{' '}
            <span style={{ color: tezcaTheme.textMuted }}>bài đăng</span>
          </div>
          {profile.showFollowers && profile.followersCount != null ? (
            <div>
              <span className="font-bold" style={{ color: tezcaTheme.text }}>{profile.followersCount}</span>{' '}
              <span style={{ color: tezcaTheme.textMuted }}>người theo dõi</span>
            </div>
          ) : null}
          <div>
            <span className="font-bold" style={{ color: tezcaTheme.text }}>{profile.followingCount}</span>{' '}
            <span style={{ color: tezcaTheme.textMuted }}>đang theo dõi</span>
          </div>
        </div>

        {/* Hành động */}
        {!profile.isSelf ? (
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={toggleFollow}
              disabled={followBusy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
              style={
                profile.isFollowedByMe
                  ? { backgroundColor: tezcaTheme.bg, color: tezcaTheme.text, border: `1px solid ${tezcaTheme.border}` }
                  : { backgroundColor: tezcaTheme.primary, color: '#fff' }
              }
            >
              {profile.isFollowedByMe ? <UserCheck size={16} /> : <UserPlus size={16} />}
              {profile.isFollowedByMe ? 'Đang theo dõi' : 'Theo dõi'}
            </button>
            {canDm ? (
              <button
                type="button"
                onClick={openDm}
                disabled={dmBusy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text, border: `1px solid ${tezcaTheme.border}` }}
              >
                <MessageCircle size={16} /> Nhắn tin
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className="flex items-center justify-between gap-3 mt-5 pt-4"
            style={{ borderTop: `1px solid ${tezcaTheme.border}` }}
          >
            <div>
              <p className="text-sm font-semibold m-0" style={{ color: tezcaTheme.text }}>
                Hiển thị người theo dõi
              </p>
              <p className="text-xs m-0 mt-0.5" style={{ color: tezcaTheme.textMuted }}>
                Cho phép thành viên khác xem số người theo dõi bạn
              </p>
            </div>
            <button
              type="button"
              onClick={toggleShowFollowers}
              disabled={settingsBusy}
              role="switch"
              aria-checked={profile.showFollowers}
              aria-label="Hiển thị người theo dõi"
              className="relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 shrink-0"
              style={{ backgroundColor: profile.showFollowers ? tezcaTheme.primary : tezcaTheme.border }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: profile.showFollowers ? '22px' : '2px' }}
              />
            </button>
          </div>
        )}
      </div>

      {/* Danh sách bài đã đăng */}
      <h2 className="text-base font-bold mt-6 mb-3" style={{ color: tezcaTheme.text }}>
        Bài đã đăng
      </h2>
      {posts.length === 0 ? (
        <div style={tezcaCardStyle} className="p-6 text-center">
          <p style={{ color: tezcaTheme.textMuted }} className="m-0">
            Chưa có bài đăng nào.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <div key={post.id} style={tezcaCardStyle} className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.primary }}
                >
                  {postTopicLabel(post.topic)}
                </span>
                <span className="text-xs" style={{ color: tezcaTheme.textMuted }}>
                  {formatDate(post.createdAt)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words m-0" style={{ color: tezcaTheme.text }}>
                {post.content}
              </p>
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="mt-2 rounded-lg max-h-80 object-cover w-full" />
              ) : null}
              <div className="flex gap-4 mt-3 text-xs" style={{ color: tezcaTheme.textMuted }}>
                <span>{post.likesCount} thích</span>
                <span>{post.commentCount} bình luận</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
