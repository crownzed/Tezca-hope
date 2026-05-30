/** @typedef {{ userId: string, userName: string, role: string }} PresenceMember */

/** @type {Map<string, Map<string, PresenceMember>>} */
const presenceByChannel = new Map();

/**
 * @param {string} channel
 * @param {PresenceMember} member
 * @returns {PresenceMember[]}
 */
export function addCommunityPresence(channel, member) {
  if (!presenceByChannel.has(channel)) presenceByChannel.set(channel, new Map());
  presenceByChannel.get(channel).set(member.userId, member);
  return listCommunityPresence(channel);
}

/**
 * @param {string} channel
 * @param {string} userId
 * @returns {PresenceMember[]}
 */
export function removeCommunityPresence(channel, userId) {
  const map = presenceByChannel.get(channel);
  if (map) {
    map.delete(userId);
    if (map.size === 0) presenceByChannel.delete(channel);
  }
  return listCommunityPresence(channel);
}

/**
 * @param {string} channel
 * @returns {PresenceMember[]}
 */
export function listCommunityPresence(channel) {
  const map = presenceByChannel.get(channel);
  if (!map) return [];
  return [...map.values()].sort((a, b) => a.userName.localeCompare(b.userName, 'vi'));
}
