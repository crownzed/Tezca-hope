export type CommunityPostTopic = 'general' | 'nutrition' | 'psychology' | 'musculoskeletal';
export type CommunityRoomTopic = 'nutrition' | 'psychology' | 'musculoskeletal';

export type ExpertSpecialtyType = 'nutrition' | 'psychology' | 'musculoskeletal' | 'general';

export const EXPERT_SPECIALTY_TYPES: {
  id: ExpertSpecialtyType;
  label: string;
  description: string;
  icon: string;
  communityTopic?: CommunityRoomTopic;
}[] = [
  {
    id: 'musculoskeletal',
    label: 'Cơ · xương · khớp',
    description: 'Phục hồi chức năng, giảm đau, vận động an toàn',
    icon: '🦴',
    communityTopic: 'musculoskeletal',
  },
  {
    id: 'psychology',
    label: 'Tâm lý',
    description: 'Sức khỏe tinh thần, quản lý stress, trị liệu nhận thức',
    icon: '🧠',
    communityTopic: 'psychology',
  },
  {
    id: 'nutrition',
    label: 'Dinh dưỡng',
    description: 'Lập kế hoạch dinh dưỡng, kiểm soát cân nặng, chuyên chế độ ăn',
    icon: '🥗',
    communityTopic: 'nutrition',
  },
  {
    id: 'general',
    label: 'Tổng quát',
    description: 'Tư vấn sức khỏe toàn diện, phòng ngừa bệnh tật',
    icon: '🩺',
    communityTopic: undefined,
  },
];

export function expertSpecialtyLabel(id: ExpertSpecialtyType | string | undefined): string {
  return EXPERT_SPECIALTY_TYPES.find((t) => t.id === id)?.label ?? (id || 'Tư vấn sức khỏe tổng quát');
}

export function expertSpecialtyIcon(id: ExpertSpecialtyType | string | undefined): string {
  return EXPERT_SPECIALTY_TYPES.find((t) => t.id === id)?.icon ?? '🩺';
}

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

export function roleBadgeLabel(role: string, specialty?: string): string {
  if (role === 'expert') {
    const found = EXPERT_SPECIALTY_TYPES.find((t) => t.id === specialty);
    if (found) return `Chuyên gia ${found.label}`;
    return 'Chuyên gia';
  }
  if (role === 'admin') return 'Quản trị';
  return 'Thành viên';
}
