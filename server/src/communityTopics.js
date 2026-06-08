export const COMMUNITY_POST_TOPICS = ['general', 'nutrition', 'psychology', 'musculoskeletal'];

export const COMMUNITY_ROOM_TOPICS = ['nutrition', 'psychology', 'musculoskeletal'];

export function isValidPostTopic(topic) {
  return COMMUNITY_POST_TOPICS.includes(topic);
}

export function isValidRoomTopic(topic) {
  return COMMUNITY_ROOM_TOPICS.includes(topic);
}
