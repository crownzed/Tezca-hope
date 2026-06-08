import { tezcaTheme } from './tezcaTheme';

const MENTION_RE = /(@[\p{L}\p{N}_][\p{L}\p{N}_.-]*)/gu;

export function renderCommunityMessageContent(content: string) {
  const parts = content.split(MENTION_RE);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={`${index}-${part}`}
          className="font-semibold"
          style={{ color: tezcaTheme.accentDark }}
        >
          {part}
        </span>
      );
    }
    return <span key={`${index}-t`}>{part}</span>;
  });
}
