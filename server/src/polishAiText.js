/**
 * Làm mượt văn bản AI trước khi trả client — giảm khoảng trắng thừa, xuống dòng gãy ý.
 * @param {string} text
 */
export function polishAiText(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.replace(/\r\n/g, '\n').trim();
  s = s.replace(/[ \t]+\n/g, '\n');
  s = s.replace(/\n[ \t]+/g, '\n');
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(/\s+([,.;:!?])/g, '$1');
  s = s.replace(/([(\[])\s+/g, '$1');
  s = s.replace(/\s+([)\]])/g, '$1');
  return s.trim();
}
