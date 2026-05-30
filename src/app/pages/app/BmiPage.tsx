import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  loadBmiEntries,
  saveBmiEntries,
  calcBmi,
  bmiCategory,
  idealWeightRangeKg,
  type BmiEntry,
} from '../../lib/healthStorage';
import { HealthProfileForm } from '../../components/HealthProfileForm';
import { FormAlert } from '../../components/tezca/FormAlert';
import { SessionLoading } from '../../components/tezca/SessionLoading';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

export function BmiPage() {
  const { token } = useCustomerAuth();
  const [entries, setEntries] = useState<BmiEntry[]>(() => loadBmiEntries());
  const [heightCm, setHeightCm] = useState('165');
  const [weightKg, setWeightKg] = useState('60');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ entries: BmiEntry[] }>('/api/me/bmi', { token })
      .then((r) => {
        const sorted = [...r.entries].sort((a, b) => b.date.localeCompare(a.date));
        setEntries(sorted);
        saveBmiEntries(sorted);
      })
      .catch(() => {
        /* API chưa chạy — giữ local */
      })
      .finally(() => setLoading(false));
  }, [token]);

  const chartData = useMemo(
    () =>
      [...entries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({ date: e.date, bmi: e.bmi })),
    [entries],
  );

  const addEntry = () => {
    setFormError('');
    const h = parseFloat(heightCm.replace(',', '.'));
    const w = parseFloat(weightKg.replace(',', '.'));
    if (!h || !w || h < 50 || h > 250 || w < 20 || w > 300) {
      setFormError('Nhập chiều cao 50–250 cm và cân nặng 20–300 kg.');
      return;
    }
    const bmi = calcBmi(h, w);
    const entry: BmiEntry = {
      id: crypto.randomUUID(),
      date,
      heightCm: h,
      weightKg: w,
      bmi,
    };
    const next = [entry, ...entries.filter((e) => !(e.date === date && Math.abs(e.weightKg - w) < 0.01))];
    next.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(next);
    saveBmiEntries(next);
    if (token) {
      apiFetch('/api/me/bmi', {
        method: 'POST',
        token,
        body: JSON.stringify({ date, heightCm: h, weightKg: w, bmi }),
      }).catch(() => {
        /* offline */
      });
    }
  };

  if (loading && token && entries.length === 0) {
    return <SessionLoading title="Đang tải chỉ số BMI…" minHeight="50vh" hint="" />;
  }

  const latest = entries[0];
  const idealKg = latest ? idealWeightRangeKg(latest.heightCm) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#1A202C' }}>
          Theo dõi sức khỏe
        </h1>
        <p className="mt-2 opacity-70" style={{ color: '#1A202C' }}>
          Ghi BMI theo ngày và cập nhật hồ sơ bệnh lý trên cùng một màn hình — làm cơ sở cho AI và chuyên gia tư vấn chính xác hơn.
        </p>
      </div>

      <div
        className="rounded-2xl p-6 md:p-8 border grid md:grid-cols-2 gap-8"
        style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
            Ngày ghi nhận
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl px-4 py-3 border text-sm"
              style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
            />
          </label>
          <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
            Chiều cao (cm)
            <input
              type="text"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="mt-1 w-full rounded-xl px-4 py-3 border text-sm"
              style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
            />
          </label>
          <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
            Cân nặng (kg)
            <input
              type="text"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="mt-1 w-full rounded-xl px-4 py-3 border text-sm"
              style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
            />
          </label>
          {formError && <FormAlert>{formError}</FormAlert>}
          <button
            type="button"
            onClick={addEntry}
            className="w-full md:w-auto rounded-full px-8 py-3 font-semibold text-white border-0 cursor-pointer"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          >
            Lưu chỉ số
          </button>
        </div>
        <div
          className="rounded-xl p-6 flex flex-col justify-center"
          style={{ backgroundColor: 'rgba(45, 212, 191, 0.08)' }}
        >
          {latest ? (
            <>
              <p className="text-sm font-medium opacity-70" style={{ color: '#1A202C' }}>
                Gần nhất ({latest.date})
              </p>
              <p className="text-4xl font-bold mt-2" style={{ color: '#1A202C' }}>
                {latest.bmi}
              </p>
              <p className="text-lg mt-1 font-medium" style={{ color: '#0F766E' }}>
                {bmiCategory(latest.bmi)}
              </p>
              <p className="text-sm mt-4 opacity-60" style={{ color: '#1A202C' }}>
                {latest.heightCm} cm · {latest.weightKg} kg
              </p>
              {idealKg && (
                <p className="text-xs mt-3 opacity-65 leading-relaxed m-0" style={{ color: '#1A202C' }}>
                  Khoảng cân tham chiếu (BMI 18,5–24,9, người lớn): khoảng <strong>{idealKg.min}–{idealKg.max} kg</strong>
                  — chỉ mang tính sàng lọc; vận động viên hoặc có bệnh nền cần đánh giá riêng.
                </p>
              )}
            </>
          ) : (
            <p className="opacity-70" style={{ color: '#1A202C' }}>
              Chưa có bản ghi. Thêm một lần đo để xem BMI tại đây.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-6 border" style={tezcaCardStyle}>
        <h2 className="text-lg font-semibold mb-4 m-0" style={{ color: tezcaTheme.text }}>
          Xu hướng BMI
        </h2>
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,32,44,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip />
                <Line type="monotone" dataKey="bmi" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#2DD4BF' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm m-0 opacity-60" style={{ color: tezcaTheme.text }}>
            Thêm ít nhất hai lần đo (ngày khác nhau) để xem biểu đồ xu hướng.
          </p>
        )}
      </div>

      <div
        className="rounded-2xl p-6 md:p-8 border"
        style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
      >
        <h2 className="text-lg font-semibold mb-1 m-0" style={{ color: tezcaTheme.text }}>
          Hồ sơ bệnh lý
        </h2>
        <p className="text-xs opacity-60 mb-6 m-0" style={{ color: tezcaTheme.text }}>
          Bổ sung bên cạnh chỉ số BMI — không thay cho khám trực tiếp.
        </p>
        <HealthProfileForm token={token} compact />
      </div>

      {entries.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(26, 32, 44, 0.04)' }}>
                <th className="text-left p-4 font-semibold" style={{ color: '#1A202C' }}>
                  Ngày
                </th>
                <th className="text-left p-4 font-semibold" style={{ color: '#1A202C' }}>
                  Cao / Nặng
                </th>
                <th className="text-left p-4 font-semibold" style={{ color: '#1A202C' }}>
                  BMI
                </th>
                <th className="text-left p-4 font-semibold" style={{ color: '#1A202C' }}>
                  Phân loại
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t" style={{ borderColor: 'rgba(26, 32, 44, 0.06)' }}>
                  <td className="p-4" style={{ color: '#1A202C' }}>
                    {e.date}
                  </td>
                  <td className="p-4" style={{ color: '#1A202C' }}>
                    {e.heightCm} cm / {e.weightKg} kg
                  </td>
                  <td className="p-4 font-medium" style={{ color: '#0F766E' }}>
                    {e.bmi}
                  </td>
                  <td className="p-4 opacity-80" style={{ color: '#1A202C' }}>
                    {bmiCategory(e.bmi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
