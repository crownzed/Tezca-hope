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

  const isToday = date === todayIso();

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

  const persistEntry = async (targetDate: string) => {
    const existing = entries.find((e) => e.date === targetDate);
    const entry: MoodEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      date: targetDate,
      moodLabel: selected.label,
      moodScore: selected.score,
      moodEmoji: selected.emoji,
      moodKey: selected.key,
      freeText: freeText.trim(),
    };
    const rest = entries.filter((e) => e.date !== targetDate);
    const next = [entry, ...rest].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(next);
    saveMoodEntries(next);
    if (token) {
      await apiFetch('/api/me/moods', {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: targetDate,
          moodLabel: selected.label,
          moodScore: selected.score,
          moodEmoji: selected.emoji,
          moodKey: selected.key,
          freeText: freeText.trim(),
        }),
      });
    }
  };

  const save = async () => {
    setSaveBusy(true);
    setSavedFlash(false);
    try {
      await persistEntry(date);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      /* local state already updated */
    } finally {
      setSaveBusy(false);
    }
  };

  const saveCurrentMoment = async () => {
    const today = todayIso();
    setDate(today);
    setSaveBusy(true);
    setSavedFlash(false);
    try {
      await persistEntry(today);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
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
          Chọn biểu cảm và ghi lại cảm xúc hiện tại — giúp bạn và chuyên gia theo dõi xu hướng tâm trạng theo thời gian.
        </p>
      </div>

      {/* Ghi nhanh cảm xúc hiện tại */}
      <div
        className="rounded-2xl p-6 md:p-8 border space-y-5"
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
              Cảm xúc hiện tại
            </h2>
            <p className="text-sm opacity-70 m-0 mt-1 leading-relaxed" style={{ color: tezcaTheme.text }}>
              Bạn đang cảm thấy thế nào ngay bây giờ? Chọn biểu cảm và mô tả ngắn — lưu cho hôm nay (
              {new Date().toLocaleDateString('vi-VN')}).
            </p>
          </div>
        </div>

        <p className="text-2xl font-semibold m-0" aria-live="polite">
          <span className="mr-2" role="img" aria-hidden>
            {selected.emoji}
          </span>
          {selected.label}
        </p>

        <div
          className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
          role="listbox"
          aria-label="Chọn trạng thái cảm xúc hiện tại"
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

        <label className="block">
          <span className="text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Ghi lại cảm xúc (tùy chọn)
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
          onClick={saveCurrentMoment}
          className="rounded-full px-8 py-3 font-semibold border-0 cursor-pointer disabled:opacity-60"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          {saveBusy ? 'Đang lưu…' : 'Lưu cảm xúc hôm nay'}
        </button>
        {savedFlash && isToday && (
          <p className="text-sm m-0 font-medium" style={{ color: tezcaTheme.accentDark }} role="status">
            Đã lưu cảm xúc cho hôm nay.
          </p>
        )}
      </div>

      {/* Nhật ký theo ngày */}
      <div
        className="rounded-2xl p-6 md:p-8 border space-y-6"
        style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
      >
        <h2 className="text-lg font-semibold m-0" style={{ color: tezcaTheme.text }}>
          Nhật ký theo ngày
        </h2>

        <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
          Ngày
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-xl px-4 py-3 border text-sm block"
            style={{ borderColor: tezcaTheme.borderStrong }}
          />
        </label>

        <div>
          <p className="text-sm font-medium mb-1 m-0" style={{ color: tezcaTheme.text }}>
            Cảm xúc trong ngày đã chọn
          </p>
          <p className="text-xl font-semibold m-0 mb-4">
            <span className="mr-2" role="img" aria-hidden>
              {selected.emoji}
            </span>
            {selected.label}
          </p>
          <div
            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
            role="listbox"
            aria-label="Chọn trạng thái cảm xúc theo ngày"
          >
            {MOOD_OPTIONS.map((m) => {
              const active = selected.key === m.key;
              return (
                <button
                  key={`day-${m.key}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={m.label}
                  title={m.label}
                  onClick={() => setSelected(m)}
                  className="flex flex-col items-center justify-center rounded-2xl border py-3 px-1 transition-all cursor-pointer"
                  style={{
                    borderColor: active ? tezcaTheme.accent : tezcaTheme.border,
                    backgroundColor: active ? 'rgba(45, 212, 191, 0.18)' : tezcaTheme.subtleBg,
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
            Ghi chú cho ngày {date}
          </span>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value.slice(0, MAX_MOOD_NOTE))}
            rows={3}
            placeholder="Điều gì ảnh hưởng đến cảm xúc của bạn trong ngày này?"
            className="mt-2 w-full rounded-xl border px-4 py-3 text-sm resize-y"
            style={{ borderColor: tezcaTheme.border }}
          />
        </label>

        <button
          type="button"
          onClick={save}
          disabled={saveBusy}
          className="rounded-full px-8 py-3 font-semibold border-0 cursor-pointer disabled:opacity-60"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          {saveBusy ? 'Đang lưu…' : 'Lưu nhật ký'}
        </button>
        {savedFlash && !isToday && (
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
            Chưa có mục nào — hãy ghi cảm xúc hiện tại ở trên.
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
