export type CommunityPostTopic =
  | 'general'
  | 'nutrition'
  | 'psychology'
  | 'musculoskeletal'
  | 'cardio'
  | 'weight_loss'
  | 'muscle_gain'
  | 'yoga'
  | 'sleep'
  | 'lifestyle'
  | 'motivation'
  | 'qa';
export type CommunityRoomTopic =
  | 'nutrition'
  | 'psychology'
  | 'musculoskeletal'
  | 'cardio'
  | 'weight_loss'
  | 'yoga';

export const POST_TOPICS: { id: CommunityPostTopic; label: string }[] = [
  { id: 'general', label: 'Chung' },
  { id: 'nutrition', label: 'Dinh dưỡng' },
  { id: 'psychology', label: 'Tâm lý' },
  { id: 'musculoskeletal', label: 'Cơ · xương · khớp' },
  { id: 'cardio', label: 'Tim mạch · sức bền' },
  { id: 'weight_loss', label: 'Giảm cân' },
  { id: 'muscle_gain', label: 'Tăng cơ' },
  { id: 'yoga', label: 'Yoga · thiền' },
  { id: 'sleep', label: 'Giấc ngủ' },
  { id: 'lifestyle', label: 'Lối sống' },
  { id: 'motivation', label: 'Động lực' },
  { id: 'qa', label: 'Hỏi đáp' },
];

export const ROOM_TOPICS: { id: CommunityRoomTopic; label: string; description: string }[] = [
  { id: 'nutrition', label: 'Dinh dưỡng', description: 'Chia sẻ thực đơn, thói quen ăn uống lành mạnh' },
  { id: 'psychology', label: 'Tâm lý', description: 'Động viên tinh thần, quản lý stress và cảm xúc' },
  { id: 'musculoskeletal', label: 'Cơ · xương · khớp', description: 'Vận động an toàn, phục hồi và giảm đau' },
  { id: 'cardio', label: 'Tim mạch · sức bền', description: 'Chạy bộ, đạp xe, cải thiện sức bền tim phổi' },
  { id: 'weight_loss', label: 'Giảm cân', description: 'Đồng hành giảm cân khoa học, bền vững' },
  { id: 'yoga', label: 'Yoga · thiền', description: 'Tập yoga, hít thở và thư giãn cùng nhau' },
];

export function postTopicLabel(id: CommunityPostTopic): string {
  return POST_TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function roleBadgeLabel(role: string): string {
  if (role === 'expert') return 'Chuyên gia';
  if (role === 'admin') return 'Quản trị';
  return 'Thành viên';
}
