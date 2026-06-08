/** Làm mượt văn bản AI hiển thị — đồng bộ logic với server/src/polishAiText.js */
export function polishAiText(text: string): string {
  if (!text) return '';
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
