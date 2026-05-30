export type CommunityFeedMode = 'for_you' | 'following' | 'latest';

export const FEED_MODES: { id: CommunityFeedMode; label: string; hint: string }[] = [
  { id: 'for_you', label: 'Dành cho bạn', hint: 'Ưu tiên chuyên gia và bài mới' },
  { id: 'following', label: 'Đang theo dõi', hint: 'Chủ đề và thành viên bạn follow' },
  { id: 'latest', label: 'Mới nhất', hint: 'Theo thời gian đăng' },
];
