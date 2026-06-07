import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { generatePersonalizedPlan, type PlanInput } from '../../lib/planGenerator';
import { ROUTES } from '../../routes';
import { recordPlanGenerated } from '../../lib/gamification';
import { apiFetch } from '../../lib/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import type { CustomerBasicProfile } from '../../components/CustomerProfileForm';
import { parseExercisesByDayFromPlanMarkdown } from '../../lib/planToExercises';
import { saveDashboardExercises, saveExerciseSchedule } from '../../lib/dashboardStorage';
import { normalizePlanExercisesFromApi } from '../../lib/trainingPlanSchedule';
import type { CustomerTrainingPlan } from '../../lib/trainingPlan';
import { adoptGuestDisciplineDataIntoAccount } from '../../lib/disciplineDataScope';
import { simulateTextStream } from '../../lib/streamAiChat';
import { FormAlert } from '../../components/tezca/FormAlert';
import { loadBmiEntries, type BmiEntry } from '../../lib/healthStorage';
import {
  buildPlanUserContext,
  type HealthProfileSnapshot,
} from '../../lib/planUserContext';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import {
  Sparkles,
  LogIn,
  Target,
  Scale,
  TrendingUp,
  Zap,
  Dumbbell,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';

const GUEST_FALLBACK_AGE = 28;

const GOALS = [
  {
    value: 'lose' as const,
    label: 'Giảm cân',
    desc: 'Đốt mỡ, giảm cân khoa học',
    icon: <Scale size={20} />,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.3)',
  },
  {
    value: 'maintain' as const,
    label: 'Duy trì',
    desc: 'Giữ cân nặng hiện tại',
    icon: <Target size={20} />,
    color: tezcaTheme.accentDark,
    bg: 'rgba(45,212,191,0.1)',
    border: 'rgba(45,212,191,0.35)',
  },
  {
    value: 'gain' as const,
    label: 'Tăng cơ',
    desc: 'Tăng khối lượng cơ bắp',
    icon: <TrendingUp size={20} />,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.3)',
  },
] as const;

const ACTIVITY_LEVELS = [
  { value: 'low' as const, label: 'Thấp', desc: 'Văn phòng, ít đi lại', icon: '🪑' },
  { value: 'medium' as const, label: 'Trung bình', desc: 'Đi bộ, vận động nhẹ', icon: '🚶' },
  { value: 'high' as const, label: 'Cao', desc: 'Tập thể thao thường xuyên', icon: '🏃' },
] as const;

/** Parse markdown plan into sections for nicer display */
function parsePlanSections(md: string): { heading: string; content: string }[] {
  const lines = md.split('\n');
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+)$/);
    if (h) {
      if (currentLines.length > 0 || currentHeading) {
        sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });
      }
      currentHeading = h[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading || currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });
  }
  return sections.filter((s) => s.heading || s.content);
}

function PlanSection({ heading, content, index }: { heading: string; content: string; index: number }) {
  const [open, setOpen] = useState(true);
  const lines = content.split('\n').filter(Boolean);
  const dayMatch = heading.match(/ngày\s*(\d)/i) || heading.match(/day\s*(\d)/i) || heading.match(/thứ\s*(\w+)/i);
  const isDay = Boolean(dayMatch);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: tezcaTheme.border,
        boxShadow: '0 2px 8px -4px rgba(26,32,44,0.06)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-90"
        style={{
          background: isDay
            ? `linear-gradient(90deg, rgba(45,212,191,0.1) 0%, rgba(255,255,255,0.8) 100%)`
            : `rgba(249,249,251,0.9)`,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            background: tezcaTheme.accentGradient,
            color: '#fff',
            boxShadow: '0 2px 8px -2px rgba(20,184,166,0.4)',
          }}
        >
          {isDay ? (dayMatch?.[1] ?? index + 1) : <Dumbbell size={13} />}
        </div>
        <span className="flex-1 text-sm font-semibold" style={{ color: tezcaTheme.text }}>
          {heading}
        </span>
        {open ? (
          <ChevronUp size={16} style={{ color: tezcaTheme.textMuted }} />
        ) : (
          <ChevronDown size={16} style={{ color: tezcaTheme.textMuted }} />
        )}
      </button>
      {open && (
        <div className="px-4 py-3" style={{ backgroundColor: tezcaTheme.surface }}>
          <ul className="space-y-1.5 m-0 p-0 list-none">
            {lines.map((line, i) => {
              const cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\*\*(.*)\*\*/, '$1');
              if (!cleaned.trim()) return null;
              const isBold = line.match(/^\*\*(.*)\*\*$/);
              return (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-sm leading-relaxed ${isBold ? 'font-semibold' : ''}`}
                  style={{ color: isBold ? tezcaTheme.accentDark : tezcaTheme.text }}
                >
                  {!isBold && (
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tezcaTheme.accent }} />
                  )}
                  {cleaned}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PlansPage() {
  const { token, user } = useCustomerAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerBasicProfile | null>(null);
  const [healthProfile, setHealthProfile] = useState<HealthProfileSnapshot | null>(null);
  const [bmiEntries, setBmiEntries] = useState<BmiEntry[]>(() => loadBmiEntries());
  const [profileLoading, setProfileLoading] = useState(Boolean(token));
  const [goal, setGoal] = useState<PlanInput['goal']>('maintain');
  const [activity, setActivity] = useState<PlanInput['activity']>('medium');
  const [dietNote, setDietNote] = useState('');
  const [plan, setPlan] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [planSource, setPlanSource] = useState<'ai' | 'local' | null>(null);
  const [integrating, setIntegrating] = useState(false);
  const [integrateMsg, setIntegrateMsg] = useState('');
  const [integrateSuccess, setIntegrateSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const loadProfileData = useCallback(() => {
    if (!token) {
      setProfile(null);
      setHealthProfile(null);
      setBmiEntries(loadBmiEntries());
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    Promise.all([
      apiFetch<{ profile: CustomerBasicProfile | null }>('/api/me/profile', { token }),
      apiFetch<{ profile: HealthProfileSnapshot | null }>('/api/me/health-profile', { token }),
      apiFetch<{ entries: BmiEntry[] }>('/api/me/bmi', { token }),
    ])
      .then(([p, h, b]) => {
        setProfile(p.profile ?? null);
        setHealthProfile(h.profile ?? null);
        setBmiEntries(b.entries ?? []);
      })
      .catch(() => {
        setBmiEntries(loadBmiEntries());
      })
      .finally(() => setProfileLoading(false));
  }, [token]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const userContext = useMemo(
    () => buildPlanUserContext({ profile, healthProfile, bmiEntries }),
    [profile, healthProfile, bmiEntries],
  );

  const previewSchedule = useMemo(
    () => (plan ? parseExercisesByDayFromPlanMarkdown(plan) : null),
    [plan],
  );

  const planSections = useMemo(
    () => (plan ? parsePlanSections(plan) : []),
    [plan],
  );

  const resolveAgeForLocal = (): number | null => {
    if (userContext.age != null) return userContext.age;
    if (!token) return GUEST_FALLBACK_AGE;
    return null;
  };

  const generate = async () => {
    setFormError('');
    const a = resolveAgeForLocal();
    if (a == null) {
      setFormError('Cần ngày sinh trong hồ sơ (14–100 tuổi) để sinh kế hoạch.');
      return;
    }

    const input: PlanInput = {
      age: a,
      goal,
      activity,
      dietNote: [dietNote.trim(), userContext.healthSummary].filter(Boolean).join('\n\n'),
    };

    if (token) {
      setPending(true);
      setPlan(null);
      setPlanSource(null);
      setIntegrateMsg('');
      setIntegrateSuccess(false);
      try {
        const r = await apiFetch<{ plan: string }>('/api/me/plan-ai', {
          method: 'POST',
          token,
          body: JSON.stringify({
            goal: input.goal,
            activity: input.activity,
            dietNote: dietNote.trim(),
          }),
        });
        setPlanSource('ai');
        setPlan('');
        await simulateTextStream(r.plan, (t) => setPlan(t), { minMs: 8, maxMs: 22 });
        recordPlanGenerated();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
        if (msg.includes('ngày sinh') || msg.includes('PROFILE_DOB')) {
          setFormError(msg);
          setPending(false);
          return;
        }
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
    setIntegrateSuccess(false);
    try {
      const r = await apiFetch<{ plan: CustomerTrainingPlan }>(
        '/api/me/training-plan/integrate',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ plan }),
        },
      );
      const scopeId = user?.id ?? null;
      if (scopeId) adoptGuestDisciplineDataIntoAccount(scopeId);
      const sched = normalizePlanExercisesFromApi(r.plan.exercises, r.plan.exercisesByDay);
      saveDashboardExercises(scopeId, sched.flat);
      if (sched.mode === 'daily') {
        saveExerciseSchedule(scopeId, sched.byDay);
      }
      setIntegrateSuccess(true);
      setIntegrateMsg(
        sched.mode === 'daily'
          ? `Đã tích hợp lịch tập ${Object.keys(sched.byDay).length} ngày (${sched.flat.length} bài) vào Chiến dịch tập luyện!`
          : `Đã tích hợp ${sched.flat.length} bài tập — chuyên gia xem và duyệt trước khi bắt đầu.`,
      );
    } catch (e) {
      setIntegrateMsg(e instanceof Error ? e.message : 'Không tích hợp được');
    } finally {
      setIntegrating(false);
    }
  };

  const selectedGoal = GOALS.find((g) => g.value === goal)!;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div
        className="rounded-2xl p-6 md:p-7 overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(45,212,191,0.14) 0%, rgba(255,255,255,0.97) 55%, #F9F9FB 100%)',
          border: `1px solid ${tezcaTheme.borderStrong}`,
          boxShadow: '0 12px 40px -20px rgba(20,184,166,0.25)',
        }}
      >
        <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full opacity-25 blur-2xl pointer-events-none bg-teal-400" />
        <div className="relative flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
          >
            <Dumbbell className="text-white" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold m-0 tracking-tight" style={{ color: tezcaTheme.text }}>
              Kế hoạch tập luyện
            </h1>
            <p className="mt-1.5 text-sm m-0 leading-relaxed" style={{ color: tezcaTheme.textMuted }}>
              {token ? (
                'AI cá nhân hoá kế hoạch 7 ngày dựa trên hồ sơ, BMI và tình trạng sức khoẻ của bạn.'
              ) : (
                <>
                  Chưa đăng nhập — hiển thị gợi ý cố định.{' '}
                  <Link
                    to={ROUTES.app.login}
                    className="inline-flex items-center gap-1 font-semibold no-underline hover:underline"
                    style={{ color: tezcaTheme.accentDark }}
                  >
                    <LogIn size={13} />
                    Đăng nhập
                  </Link>{' '}
                  để sinh kế hoạch AI từ dữ liệu thật.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Profile context card */}
      {token && (
        <section
          className="rounded-xl border p-4 md:p-5 space-y-3"
          style={{ ...tezcaCardStyle, background: 'linear-gradient(135deg, rgba(45,212,191,0.06) 0%, #ffffff 100%)' }}
        >
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: tezcaTheme.accentDark }} />
            <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: tezcaTheme.accentDark }}>
              Dữ liệu từ hồ sơ
            </p>
          </div>
          {profileLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" style={{ color: tezcaTheme.textMuted }} />
              <p className="text-sm m-0" style={{ color: tezcaTheme.textMuted }}>Đang tải hồ sơ…</p>
            </div>
          ) : userContext.profileLines.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userContext.profileLines.map((line) => (
                <span
                  key={line}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(45,212,191,0.1)',
                    color: tezcaTheme.accentDark,
                    border: '1px solid rgba(45,212,191,0.25)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  {line}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm m-0" style={{ color: tezcaTheme.textMuted }}>Chưa có đủ thông tin trong hồ sơ.</p>
          )}
          {userContext.healthSummary && (
            <p
              className="text-xs m-0 pt-2 border-t flex items-center gap-1.5"
              style={{ borderColor: tezcaTheme.border, color: tezcaTheme.textMuted }}
            >
              <CheckCircle2 size={12} style={{ color: tezcaTheme.accent }} />
              Hồ sơ bệnh lý đã tự động gửi kèm khi sinh kế hoạch.
            </p>
          )}
          {!profileLoading && !userContext.hasDob && (
            <p className="text-sm m-0 pt-1 flex items-center gap-2" style={{ color: '#92400e' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Thiếu ngày sinh —{' '}
              <Link to={ROUTES.app.profile} className="font-semibold underline" style={{ color: '#92400e' }}>
                cập nhật hồ sơ
              </Link>
            </p>
          )}
        </section>
      )}

      {/* Plan configuration */}
      <div className="rounded-2xl p-6 md:p-7 border space-y-6" style={tezcaCardStyle}>
        {/* Goal selection */}
        <div>
          <p className="text-sm font-bold mb-3 m-0 flex items-center gap-1.5" style={{ color: tezcaTheme.text }}>
            <Target size={14} style={{ color: tezcaTheme.accentDark }} />
            Mục tiêu của bạn
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className="relative flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-2xl border text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  borderColor: goal === g.value ? g.border : tezcaTheme.border,
                  backgroundColor: goal === g.value ? g.bg : 'transparent',
                  boxShadow: goal === g.value ? `0 4px 16px -4px ${g.color}33` : 'none',
                }}
              >
                {goal === g.value && (
                  <span
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: g.color }}
                  >
                    <CheckCircle2 size={12} className="text-white" />
                  </span>
                )}
                <span style={{ color: goal === g.value ? g.color : tezcaTheme.textMuted }}>
                  {g.icon}
                </span>
                <span
                  className="text-sm font-bold leading-tight"
                  style={{ color: goal === g.value ? g.color : tezcaTheme.text }}
                >
                  {g.label}
                </span>
                <span
                  className="text-[11px] leading-tight hidden md:block"
                  style={{ color: tezcaTheme.textMuted }}
                >
                  {g.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity level */}
        <div>
          <p className="text-sm font-bold mb-3 m-0 flex items-center gap-1.5" style={{ color: tezcaTheme.text }}>
            <Zap size={14} style={{ color: tezcaTheme.accentDark }} />
            Mức độ vận động
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setActivity(a.value)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all hover:opacity-90"
                style={{
                  borderColor: activity === a.value ? tezcaTheme.borderStrong : tezcaTheme.border,
                  backgroundColor: activity === a.value ? tezcaTheme.subtleBg : 'transparent',
                  boxShadow: activity === a.value ? '0 2px 8px -2px rgba(26,32,44,0.1)' : 'none',
                }}
              >
                <span className="text-xl">{a.icon}</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: activity === a.value ? tezcaTheme.accentDark : tezcaTheme.text }}
                >
                  {a.label}
                </span>
                <span className="text-[10px] leading-tight hidden sm:block" style={{ color: tezcaTheme.textMuted }}>
                  {a.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Diet note */}
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: tezcaTheme.text }}>
            Ghi chú thêm{' '}
            <span className="font-normal text-xs" style={{ color: tezcaTheme.textMuted }}>
              (tùy chọn)
            </span>
          </label>
          <textarea
            value={dietNote}
            onChange={(e) => setDietNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl px-4 py-3 border text-sm leading-relaxed focus:outline-none focus:ring-2 transition-shadow"
            style={{
              borderColor: tezcaTheme.borderStrong,
              backgroundColor: tezcaTheme.surface,
              color: tezcaTheme.text,
            }}
            placeholder="Chấn thương, thiết bị có sẵn, giới hạn khớp… (hồ sơ bệnh lý đã tự động gửi kèm)"
          />
        </div>

        {formError && <FormAlert>{formError}</FormAlert>}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={pending || (Boolean(token) && !profileLoading && !userContext.hasDob)}
          className="w-full rounded-2xl px-8 py-4 font-bold text-white disabled:opacity-50 border-0 cursor-pointer disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 text-base"
          style={{
            background: tezcaTheme.accentGradient,
            boxShadow: '0 8px 24px -8px rgba(20,184,166,0.5)',
          }}
        >
          {pending ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Đang sinh kế hoạch AI…
            </>
          ) : (
            <>
              <Sparkles size={18} />
              {token ? 'Sinh lịch tập 7 ngày với AI' : 'Sinh lịch tập (gợi ý nhanh)'}
            </>
          )}
        </button>
      </div>

      {/* Plan result */}
      {plan !== null && (
        <div className="space-y-4">
          {/* Plan header badge */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: planSource === 'ai' ? tezcaTheme.accentGradient : 'rgba(26,32,44,0.08)',
                color: planSource === 'ai' ? '#fff' : tezcaTheme.textMuted,
                boxShadow: planSource === 'ai' ? '0 4px 12px -4px rgba(20,184,166,0.4)' : 'none',
              }}
            >
              {planSource === 'ai' ? <Sparkles size={12} /> : <Dumbbell size={12} />}
              {planSource === 'ai' ? 'Tạo bởi Gemini AI' : 'Gợi ý cố định (offline)'}
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: tezcaTheme.textMuted }}>
              <span
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: selectedGoal.bg, color: selectedGoal.color, border: `1px solid ${selectedGoal.border}` }}
              >
                {selectedGoal.label}
              </span>
              ·
              <span>{ACTIVITY_LEVELS.find((a) => a.value === activity)?.label} vận động</span>
            </div>
          </div>

          {/* Sections or raw */}
          {planSections.length > 1 ? (
            <div className="space-y-2">
              {planSections.map((s, i) => (
                <PlanSection key={i} heading={s.heading} content={s.content} index={i} />
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 md:p-6 border text-sm leading-relaxed"
              style={{ ...tezcaCardStyle, color: tezcaTheme.text }}
            >
              <pre className="whitespace-pre-wrap font-sans m-0">{plan}</pre>
            </div>
          )}

          {/* Integrate CTA */}
          {token ? (
            <div
              className="rounded-2xl p-5 md:p-6 border space-y-4"
              style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.08) 0%, rgba(255,255,255,0.98) 100%)',
                borderColor: 'rgba(45,212,191,0.3)',
                boxShadow: '0 4px 24px -8px rgba(20,184,166,0.2)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tezcaTheme.accentGradient, boxShadow: '0 4px 12px -4px rgba(20,184,166,0.5)' }}
                >
                  <LayoutDashboard size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold m-0" style={{ color: tezcaTheme.text }}>
                    Tích hợp vào Chiến dịch tập luyện
                  </p>
                  <p className="text-xs mt-0.5 m-0" style={{ color: tezcaTheme.textMuted }}>
                    {previewSchedule && previewSchedule.mode === 'daily'
                      ? `Lịch ${Object.keys(previewSchedule.byDay).length} ngày · ${previewSchedule.flat.length} bài tập riêng biệt mỗi ngày`
                      : previewSchedule && previewSchedule.flat.length > 0
                        ? `${previewSchedule.flat.length} bài tập — nên sinh lại nếu thiếu đủ 7 ngày`
                        : 'Tạo buổi tổng hợp để chuyên gia chỉnh sửa và duyệt'}
                  </p>
                </div>
              </div>

              {integrateMsg && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm"
                  style={
                    integrateSuccess
                      ? { backgroundColor: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.25)' }
                      : { backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }
                  }
                >
                  {integrateSuccess ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : null}
                  {integrateMsg}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void integrateToTraining()}
                  disabled={integrating || integrateSuccess}
                  className="flex-1 sm:flex-none rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-60 border-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    background: tezcaTheme.accentGradient,
                    boxShadow: '0 6px 20px -6px rgba(20,184,166,0.5)',
                  }}
                >
                  {integrating ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Đang tích hợp…
                    </>
                  ) : integrateSuccess ? (
                    <>
                      <CheckCircle2 size={15} />
                      Đã tích hợp
                    </>
                  ) : (
                    <>
                      <Zap size={15} />
                      Tích hợp ngay
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.app.dashboard)}
                  className="flex-1 sm:flex-none rounded-xl px-5 py-3 text-sm font-semibold border cursor-pointer transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    borderColor: tezcaTheme.borderStrong,
                    color: tezcaTheme.text,
                    backgroundColor: tezcaTheme.surface,
                  }}
                >
                  Mở chiến dịch
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-4 text-sm flex items-center gap-3"
              style={{ backgroundColor: 'rgba(45,212,191,0.08)', border: '1px dashed rgba(45,212,191,0.4)' }}
            >
              <LogIn size={18} style={{ color: tezcaTheme.accentDark, shrink: 0 }} />
              <p className="m-0" style={{ color: tezcaTheme.text }}>
                <Link to={ROUTES.app.login} className="font-bold no-underline hover:underline" style={{ color: tezcaTheme.accentDark }}>
                  Đăng nhập
                </Link>{' '}
                để tích hợp vào tập luyện và gửi cho chuyên gia duyệt.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
