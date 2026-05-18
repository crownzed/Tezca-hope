import { useEffect, useState } from 'react';
import { loadMoodEntries, saveMoodEntries, type MoodEntry } from '../../lib/healthStorage';
import { apiFetch } from '../../lib/api';
import { usePatientAuth } from '../../context/PatientAuthContext';

const MOODS = [
  { label: 'Rất tốt', score: 5, emoji: '😄' },
  { label: 'Ổn', score: 4, emoji: '🙂' },
  { label: 'Bình thường', score: 3, emoji: '😐' },
  { label: 'Khó chịu', score: 2, emoji: '😔' },
  { label: 'Rất khó', score: 1, emoji: '😣' },
];

export function MoodJournalPage() {
  const { token } = usePatientAuth();
  const [entries, setEntries] = useState<MoodEntry[]>(() => loadMoodEntries());
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState(MOODS[2]);
  const [note, setNote] = useState('');

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

  const save = () => {
    const noteTrim = note.trim();
    const entry: MoodEntry = {
      id: crypto.randomUUID(),
      date,
      moodLabel: selected.label,
      moodScore: selected.score,
      note: noteTrim,
    };
    const rest = entries.filter((e) => e.date !== date);
    const next = [entry, ...rest].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(next);
    saveMoodEntries(next);
    setNote('');
    if (token) {
      apiFetch('/api/me/moods', {
        method: 'POST',
        token,
        body: JSON.stringify({
          date,
          moodLabel: selected.label,
          moodScore: selected.score,
          note: noteTrim,
        }),
      }).catch(() => {});
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#1A202C' }}>
          Nhật ký cảm xúc
        </h1>
        <p className="mt-2 opacity-70" style={{ color: '#1A202C' }}>
          Ghi lại tâm trạng mỗi ngày. Dữ liệu giúp bạn và (sau này) chuyên gia nắm xu hướng tinh thần.
        </p>
      </div>

      <div className="rounded-2xl p-6 md:p-8 border space-y-6" style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}>
        <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
          Ngày
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-xl px-4 py-3 border text-sm"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
          />
        </label>

        <div>
          <p className="text-sm font-medium mb-3" style={{ color: '#1A202C' }}>
            Hôm nay bạn cảm thấy thế nào?
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setSelected(m)}
                className="rounded-2xl px-4 py-3 text-sm font-medium border transition-all"
                style={{
                  borderColor: selected.label === m.label ? '#14B8A6' : 'rgba(26, 32, 44, 0.12)',
                  backgroundColor: selected.label === m.label ? 'rgba(45, 212, 191, 0.15)' : 'transparent',
                  color: '#1A202C',
                }}
              >
                <span className="mr-2">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
          Ghi chú (tuỳ chọn)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Vài dòng về ngày hôm nay…"
            className="mt-1 w-full rounded-xl px-4 py-3 border text-sm resize-y min-h-[88px]"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
          />
        </label>

        <button
          type="button"
          onClick={save}
          className="rounded-full px-8 py-3 font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
        >
          Lưu nhật ký
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold" style={{ color: '#1A202C' }}>
          Các ngày đã ghi
        </h2>
        {entries.length === 0 ? (
          <p className="opacity-60 text-sm" style={{ color: '#1A202C' }}>
            Chưa có mục nào.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
              >
                <div>
                  <span className="font-medium" style={{ color: '#1A202C' }}>
                    {e.date}
                  </span>
                  <span className="mx-2 opacity-40">·</span>
                  <span style={{ color: '#0F766E' }}>{e.moodLabel}</span>
                </div>
                {e.note && (
                  <p className="text-sm opacity-70 sm:text-right max-w-md" style={{ color: '#1A202C' }}>
                    {e.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
