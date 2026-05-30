export type CommunityPostTopic = 'general' | 'nutrition' | 'psychology' | 'musculoskeletal';
export type CommunityRoomTopic = 'nutrition' | 'psychology' | 'musculoskeletal';

export const POST_TOPICS: { id: CommunityPostTopic; label: string }[] = [
  { id: 'general', label: 'Chung' },
  { id: 'nutrition', label: 'Dinh dưỡng' },
  { id: 'psychology', label: 'Tâm lý' },
  { id: 'musculoskeletal', label: 'Cơ · xương · khớp' },
];

export const ROOM_TOPICS: { id: CommunityRoomTopic; label: string; description: string }[] = [
  { id: 'nutrition', label: 'Dinh dưỡng', description: 'Chia sẻ thực đơn, thói quen ăn uống lành mạnh' },
  { id: 'psychology', label: 'Tâm lý', description: 'Động viên tinh thần, quản lý stress và cảm xúc' },
  { id: 'musculoskeletal', label: 'Cơ · xương · khớp', description: 'Vận động an toàn, phục hồi và giảm đau' },
];

export function postTopicLabel(id: CommunityPostTopic): string {
  return POST_TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function roleBadgeLabel(role: string): string {
  if (role === 'expert') return 'Chuyên gia';
  if (role === 'admin') return 'Quản trị';
  return 'Thành viên';
}
