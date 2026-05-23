import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { generatePersonalizedPlan, type PlanInput } from '../../lib/planGenerator';
import { ROUTES } from '../../routes';
import { recordPlanGenerated } from '../../lib/gamification';
import { apiFetch } from '../../lib/api';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { parseExercisesFromPlanMarkdown } from '../../lib/planToExercises';
import { loadDashboardExercises, saveDashboardExercises } from '../../lib/dashboardStorage';
import { simulateTextStream } from '../../lib/streamAiChat';

export function PlansPage() {
  const { token, user } = usePatientAuth();
  const navigate = useNavigate();
  const [age, setAge] = useState('28');
  const [goal, setGoal] = useState<PlanInput['goal']>('maintain');
  const [activity, setActivity] = useState<PlanInput['activity']>('medium');
  const [dietNote, setDietNote] = useState('');
  const [plan, setPlan] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [planSource, setPlanSource] = useState<'ai' | 'local' | null>(null);
  const [integrating, setIntegrating] = useState(false);
  const [integrateMsg, setIntegrateMsg] = useState('');

  const previewExercises = useMemo(
    () => (plan ? parseExercisesFromPlanMarkdown(plan) : []),
    [plan],
  );

  const generate = async () => {
    const a = parseInt(age, 10);
    if (!a || a < 14 || a > 100) {
      alert('Vui lòng nhập độ tuổi hợp lệ (14–100).');
      return;
    }
    const input: PlanInput = {
      age: a,
      goal,
      activity,
      dietNote: dietNote.trim(),
    };

    if (token) {
      setPending(true);
      setPlan(null);
      setPlanSource(null);
      try {
        const r = await apiFetch<{ plan: string }>('/api/me/plan-ai', {
          method: 'POST',
          token,
          body: JSON.stringify({
            age: input.age,
            goal: input.goal,
            activity: input.activity,
            dietNote: input.dietNote,
          }),
        });
        setPlanSource('ai');
        setPlan('');
        await simulateTextStream(r.plan, (t) => setPlan(t), { minMs: 8, maxMs: 22 });
        recordPlanGenerated();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
        const fallback = generatePersonalizedPlan(input);
        setPlan(
          `**Không gọi được AI (${msg}).** Hiển thị bản gợi ý cố định (dự phòng):\n\n${fallback}`,
        );
        setPlanSource('local');
        recordPlanGenerated();
      } finally {
        setPending(false);
      }
      return;
    }

    const local = generatePersonalizedPlan(input);
    setPlan(local);
    setPlanSource('local');
    recordPlanGenerated();
  };

  const integrateToTraining = async () => {
    if (!plan || !token) return;
    setIntegrating(true);
    setIntegrateMsg('');
    try {
      const r = await apiFetch<{ plan: { exercises: ReturnType<typeof parseExercisesFromPlanMarkdown> } }>(
        '/api/me/training-plan/integrate',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ plan }),
        },
      );
      saveDashboardExercises(user?.id ?? null, r.plan.exercises);
      setIntegrateMsg('Đã tích hợp vào Chiến dịch tập luyện. Chuyên gia có thể xem và chỉnh sửa trước khi duyệt.');
    } catch (e) {
      setIntegrateMsg(e instanceof Error ? e.message : 'Không tích hợp được');
    } finally {
      setIntegrating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#1A202C' }}>
          Kế hoạch dinh dưỡng &amp; tập luyện
        </h1>
        <p className="mt-2 opacity-70" style={{ color: '#1A202C' }}>
          {token ? (
            'Đã đăng nhập: kế hoạch do Gemini soạn qua server Tezca. Nếu API lỗi hoặc chưa cấu hình key, hệ thống dùng bản gợi ý cố định.'
          ) : (
            <>
              Chưa đăng nhập: chỉ có bản gợi ý cố định trên máy.{' '}
              <Link to={ROUTES.app.login} style={{ color: '#0F766E', fontWeight: 600 }}>
                Đăng nhập bệnh nhân
              </Link>{' '}
              để sinh kế hoạch bằng AI.
            </>
          )}
        </p>
      </div>

      <div className="rounded-2xl p-6 md:p-8 border space-y-5" style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}>
        <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
          Tuổi
          <input
            type="number"
            min={14}
            max={100}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-xl px-4 py-3 border text-sm"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
          />
        </label>

        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#1A202C' }}>
            Mục tiêu
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['lose', 'Giảm cân'],
                ['maintain', 'Duy trì'],
                ['gain', 'Tăng cân/nạc'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setGoal(v)}
                className="rounded-full px-4 py-2 text-sm font-medium border"
                style={{
                  borderColor: goal === v ? '#14B8A6' : 'rgba(26, 32, 44, 0.12)',
                  backgroundColor: goal === v ? 'rgba(45, 212, 191, 0.15)' : 'transparent',
                  color: '#1A202C',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#1A202C' }}>
            Mức vận động
          </p>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as PlanInput['activity'])}
            className="w-full max-w-md rounded-xl px-4 py-3 border text-sm"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
          >
            <option value="low">Thấp (văn phòng, ít đi lại)</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao (tập thường xuyên)</option>
          </select>
        </div>

        <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
          Ghi chú ăn uống / dị ứng / chế độ đặc biệt
          <textarea
            value={dietNote}
            onChange={(e) => setDietNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl px-4 py-3 border text-sm"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
            placeholder="Ví dụ: không lactose, ăn chay, tiểu đường…"
          />
        </label>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={pending}
          className="rounded-full px-8 py-3 font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
        >
          {pending ? 'Đang sinh…' : token ? 'Sinh kế hoạch (AI)' : 'Sinh kế hoạch (gợi ý nhanh)'}
        </button>
      </div>

      {plan && (
        <div
          className="rounded-2xl p-6 md:p-8 border text-sm leading-relaxed"
          style={{
            backgroundColor: 'rgba(26, 32, 44, 0.03)',
            borderColor: 'rgba(26, 32, 44, 0.08)',
            color: '#1A202C',
          }}
        >
          {planSource && (
            <p className="text-xs opacity-60 mb-4 m-0">
              Nguồn: {planSource === 'ai' ? 'Gemini qua API' : 'Gợi ý cố định trên máy'}
            </p>
          )}
          <pre className="whitespace-pre-wrap font-sans m-0">{plan}</pre>
          {token ? (
            <div className="mt-6 pt-6 border-t space-y-3" style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}>
              <p className="text-sm m-0 opacity-80">
                {previewExercises.length > 0
                  ? `Sẽ thêm ${previewExercises.length} mục vận động vào Trung tâm kỷ luật (Chiến dịch tập luyện). Chuyên gia được gán có thể kiểm tra và chỉnh sửa.`
                  : 'Không trích được mục vận động rõ — hệ thống vẫn tạo một buổi tổng hợp để chuyên gia chỉnh.'}
              </p>
              {integrateMsg && (
                <p className="text-sm m-0" style={{ color: '#0F766E' }}>
                  {integrateMsg}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void integrateToTraining()}
                  disabled={integrating}
                  className="rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#0F766E' }}
                >
                  {integrating ? 'Đang tích hợp…' : 'Tích hợp vào tập luyện'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.app.root)}
                  className="rounded-full px-6 py-2.5 text-sm font-medium border"
                  style={{ borderColor: 'rgba(26, 32, 44, 0.15)', color: '#1A202C' }}
                >
                  Mở Chiến dịch tập luyện
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-6 m-0 opacity-70">
              <Link to={ROUTES.app.login} style={{ color: '#0F766E', fontWeight: 600 }}>
                Đăng nhập
              </Link>{' '}
              để tích hợp kế hoạch vào phần tập luyện và gửi cho chuyên gia duyệt.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
