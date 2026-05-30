import { useCallback, useEffect, useRef, useState } from 'react';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { roleBadgeLabel } from '../../lib/communityTopics';

export type MentionCandidate = {
  id: string;
  name: string;
  role: string;
};

type ChatMentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  fetchCandidates: (query: string) => Promise<MentionCandidate[]>;
  className?: string;
};

function getMentionState(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  const match = before.match(/@([\p{L}\p{N}_.-]*)$/u);
  if (!match) return null;
  return { query: match[1], start: cursor - match[0].length };
}

export function ChatMentionInput({
  value,
  onChange,
  onSend,
  placeholder,
  fetchCandidates,
  className = '',
}: ChatMentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MentionCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const fetchRef = useRef(fetchCandidates);
  fetchRef.current = fetchCandidates;

  const loadCandidates = useCallback(async (query: string) => {
    try {
      const list = await fetchRef.current(query);
      setItems(list);
      setActiveIndex(0);
      setOpen(list.length > 0);
    } catch {
      setItems([]);
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || mentionStart === null) return;
    const state = getMentionState(value, input.selectionStart ?? value.length);
    if (!state) {
      setOpen(false);
      setMentionStart(null);
      return;
    }
    const timer = window.setTimeout(() => loadCandidates(state.query), 200);
    return () => window.clearTimeout(timer);
  }, [value, mentionStart, loadCandidates]);

  const applyMention = (candidate: MentionCandidate) => {
    const input = inputRef.current;
    if (!input || mentionStart === null) return;
    const cursor = input.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const insert = `@${candidate.name.replace(/\s+/g, '')} `;
    const next = `${before}${insert}${after}`;
    onChange(next);
    setOpen(false);
    setMentionStart(null);
    window.requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      input.focus();
      input.setSelectionRange(pos, pos);
    });
  };

  const handleChange = (next: string) => {
    onChange(next);
    const input = inputRef.current;
    const cursor = input?.selectionStart ?? next.length;
    const state = getMentionState(next, cursor);
    if (state) {
      setMentionStart(state.start);
    } else {
      setMentionStart(null);
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        applyMention(items[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={() => {
          const input = inputRef.current;
          if (!input) return;
          const state = getMentionState(value, input.selectionStart ?? value.length);
          setMentionStart(state?.start ?? null);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm"
        style={{ borderColor: tezcaTheme.border }}
        autoComplete="off"
      />
      {open && items.length > 0 && (
        <ul
          className="absolute left-0 right-0 bottom-full mb-1 max-h-48 overflow-y-auto rounded-xl border shadow-lg list-none m-0 p-1 z-20"
          style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.bg }}
          role="listbox"
        >
          {items.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyMention(item)}
                className="w-full text-left rounded-lg px-3 py-2 border-0 cursor-pointer text-sm"
                style={
                  index === activeIndex
                    ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                    : { backgroundColor: 'transparent', color: tezcaTheme.text }
                }
              >
                <span className="font-medium">@{item.name}</span>
                <span className="opacity-60 text-xs ml-2">{roleBadgeLabel(item.role)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
