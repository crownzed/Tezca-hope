import { useEffect, useMemo, useState } from 'react';
import { PenLine } from 'lucide-react';
import { loadMoodEntries, saveMoodEntries, type MoodEntry } from '../../lib/healthStorage';
import { apiFetch } from '../../lib/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  DEFAULT_MOOD,
  MOOD_OPTIONS,
  findMoodOption,
  moodDisplay,
  type MoodOption,
} from '../../lib/moodOptions';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

const MAX_MOOD_NOTE = 500;
const todayIso = () => new Date().toISOString().slice(0, 10);

function resolveSelection(entry?: Pick<MoodEntry, 'moodLabel' | 'moodEmoji' | 'moodScore'>): MoodOption {
  if (!entry) return DEFAULT_MOOD;
  return (
    findMoodOption({ label: entry.moodLabel, emoji: entry.moodEmoji }) ??
    MOOD_OPTIONS.find((m) => m.score === entry.moodScore) ??
    DEFAULT_MOOD
  );
}

export function MoodJournalPage() {
  const { token } = useCustomerAuth();
  const [entries, setEntries] = useState<MoodEntry[]>(() => loadMoodEntries());
  const [date, setDate] = useState(todayIso);
  const [selected, setSelected] = useState<MoodOption>(DEFAULT_MOOD);
  const [freeText, setFreeText] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const entryForDate = useMemo(
    () => entries.find((e) => e.date === date),
    [entries, date],
  );

  useEffect(() => {
    setSelected(resolveSelection(entryForDate));
    setFreeText(entryForDate?.freeText?.trim() ?? '');
  }, [date, entryForDate]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ entries: MoodEntry[] }>('/api/me/moods', { token })
      .then((r) => {
        const sorted = [...r.entries].sort((a, b) => b.date.localeCompare(a.date));
        setEntries(sorted);
        saveMoodEntries(sorted);
      })
      .catch(() => {});
  }, [token]);

  const save = async () => {
    setSaveBusy(true);
    setSavedFlash(false);
    try {
      const existing = entries.find((e) => e.date === date);
      const entry: MoodEntry = {
        id: existing?.id ?? crypto.randomUUID(),
        date,
        moodLabel: selected.label,
        moodScore: selected.score,
        moodEmoji: selected.emoji,
        moodKey: selected.key,
        freeText: freeText.trim(),
      };
      const rest = entries.filter((e) => e.date !== date);
      const next = [entry, ...rest].sort((a, b) => b.date.localeCompare(a.date));
      setEntries(next);
      saveMoodEntries(next);
      if (token) {
        await apiFetch('/api/me/moods', {
          method: 'POST',
          token,
          body: JSON.stringify({
            date,
            moodLabel: selected.label,
            moodScore: selected.score,
            moodEmoji: selected.emoji,
            moodKey: selected.key,
            freeText: freeText.trim(),
          }),
        });
      }
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      /* local state already updated */
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold m-0" style={{ color: tezcaTheme.text }}>
          Nhật ký cảm xúc
        </h1>
        <p className="mt-2 opacity-70 text-sm leading-relaxed m-0" style={{ color: tezcaTheme.text }}>
          Chọn biểu cảm và ghi lại cảm xúc — giúp bạn và chuyên gia theo dõi xu hướng tâm trạng theo thời gian.
        </p>
      </div>

      <div
        className="rounded-2xl p-6 md:p-8 border space-y-6"
        style={{
          ...tezcaCardStyle,
          background:
            'linear-gradient(135deg, rgba(45, 212, 191, 0.1) 0%, rgba(20, 184, 166, 0.04) 100%)',
          borderColor: 'rgba(45, 212, 191, 0.35)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: tezcaTheme.accentGradient }}
          >
            <PenLine size={22} style={{ color: tezcaTheme.text }} aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold m-0" style={{ color: tezcaTheme.text }}>
              Ghi nhật ký
            </h2>
            <p className="text-sm opacity-70 m-0 mt-1 leading-relaxed" style={{ color: tezcaTheme.text }}>
              Chọn ngày, biểu cảm và mô tả cảm xúc của bạn.
            </p>
          </div>
        </div>

        <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
          Ngày
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-xl px-4 py-3 border text-sm block"
            style={{ borderColor: tezcaTheme.borderStrong, backgroundColor: tezcaTheme.surface }}
          />
        </label>

        <div>
          <p className="text-sm font-medium mb-2 m-0" style={{ color: tezcaTheme.text }}>
            Cảm xúc
            <span className="font-normal opacity-70 ml-2">
              {selected.emoji} {selected.label}
            </span>
          </p>
          <div
            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
            role="listbox"
            aria-label="Chọn trạng thái cảm xúc"
          >
            {MOOD_OPTIONS.map((m) => {
              const active = selected.key === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={m.label}
                  title={m.label}
                  onClick={() => setSelected(m)}
                  className="flex flex-col items-center justify-center rounded-2xl border py-3 px-1 transition-all cursor-pointer"
                  style={{
                    borderColor: active ? tezcaTheme.accent : tezcaTheme.border,
                    backgroundColor: active ? 'rgba(45, 212, 191, 0.22)' : tezcaTheme.surface,
                    boxShadow: active ? `0 0 0 2px ${tezcaTheme.accent}` : undefined,
                  }}
                >
                  <span className="text-2xl md:text-3xl leading-none" role="img" aria-hidden>
                    {m.emoji}
                  </span>
                  <span className="sr-only">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Ghi lại cảm xúc
          </span>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value.slice(0, MAX_MOOD_NOTE))}
            rows={4}
            placeholder="Ví dụ: Sáng nay hơi lo trước buổi khám, chiều đi bộ thấy nhẹ đầu hơn…"
            className="mt-2 w-full rounded-xl border px-4 py-3 text-sm resize-y leading-relaxed"
            style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.surface }}
          />
          <span className="text-xs opacity-50 mt-1 block">
            {freeText.length}/{MAX_MOOD_NOTE} ký tự
          </span>
        </label>

        <button
          type="button"
          disabled={saveBusy}
          onClick={save}
          className="rounded-full px-8 py-3 font-semibold border-0 cursor-pointer disabled:opacity-60"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          {saveBusy ? 'Đang lưu…' : 'Lưu nhật ký'}
        </button>
        {savedFlash && (
          <p className="text-sm m-0 font-medium" style={{ color: tezcaTheme.accentDark }} role="status">
            Đã lưu cho ngày {date}.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold m-0" style={{ color: tezcaTheme.text }}>
          Các ngày đã ghi
        </h2>
        {entries.length === 0 ? (
          <p className="opacity-60 text-sm m-0" style={{ color: tezcaTheme.text }}>
            Chưa có mục nào — hãy ghi cảm xúc ở trên.
          </p>
        ) : (
          <ul className="space-y-2 list-none m-0 p-0">
            {entries.map((e) => {
              const d = moodDisplay(e);
              const note = e.freeText?.trim();
              return (
                <li
                  key={e.id}
                  className="rounded-xl p-4 border"
                  style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0" role="img" aria-hidden>
                      {d.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-medium text-sm" style={{ color: tezcaTheme.text }}>
                        {e.date}
                        <span className="mx-2 opacity-40">·</span>
                        <span style={{ color: tezcaTheme.accentDark }}>{d.label}</span>
                      </p>
                      {note ? (
                        <p className="m-0 mt-2 text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{note}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
