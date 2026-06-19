// Chủ đề cộng đồng. CHECK constraint ở DB đã được gỡ (migration v24) — danh sách
// này là nguồn sự thật để validate ở tầng ứng dụng. Thêm chủ đề mới = chỉ cần
// thêm vào đây (cả frontend src/app/lib/communityTopics.ts), KHÔNG cần migration.
export const COMMUNITY_POST_TOPICS = [
  'general',
  'nutrition',
  'psychology',
  'musculoskeletal',
  'cardio',
  'weight_loss',
  'muscle_gain',
  'yoga',
  'sleep',
  'lifestyle',
  'motivation',
  'qa',
];

export const COMMUNITY_ROOM_TOPICS = [
  'nutrition',
  'psychology',
  'musculoskeletal',
  'cardio',
  'weight_loss',
  'yoga',
];

export function isValidPostTopic(topic) {
  return COMMUNITY_POST_TOPICS.includes(topic);
}

export function isValidRoomTopic(topic) {
  return COMMUNITY_ROOM_TOPICS.includes(topic);
}
