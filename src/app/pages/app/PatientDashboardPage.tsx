import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  Check,
  Flame,
  Lock,
  Plus,
  Quote,
  TrendingDown,
  Trash2,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react';
import { usePatientSession } from '../../lib/patientSessionGate';
import { deriveGamificationState } from '../../lib/gamification';
import { loadBmiEntries } from '../../lib/healthStorage';
import { MeatCatalogReference, MeatTypePicker } from '../../components/MeatNutritionPanel';
import {
  analyzeFoodInput,
  estimateFromMeatId,
  foodLogForDay,
  nutritionProgressPct,
  resolveDailyNutritionTargets,
  sumNutrition,
  todayIsoLocal,
  type DashboardExercise,
  type FoodEstimateResult,
  type FoodLogItem,
} from '../../lib/dashboardStorage';
import { useDisciplineDataScope } from '../../lib/disciplineDataScope';
import { ROUTES } from '../../routes';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import {
  applyDayProgress,
  buildWeekDaysWithIso,
  countDayDone,
  extractDayProgress,
  isoDateForWeekDayId,
} from '../../lib/trainingDayProgress';

const MOTIVATIONAL_QUOTES = [
  { text: 'Kỷ luật là chiếc cầu nối giữa mục tiêu và thành tựu.', author: 'Jim Rohn' },
  { text: 'Nỗi đau của sự kỷ luật không là gì so với nỗi đau của sự hối tiếc.', author: 'Khuyết danh' },
  { text: 'Bạn không thể có một cơ thể trị giá triệu đô với một tư duy rẻ tiền.', author: 'Khuyết danh' },
  { text: 'Đừng dừng lại khi bạn mệt mỏi. Hãy dừng lại khi bạn đã hoàn thành.', author: 'David Goggins' },
  {
    text: 'Sức mạnh không đến từ những việc bạn có thể làm. Nó đến từ việc vượt qua những điều bạn từng nghĩ mình không thể.',
    author: 'Rikki Rogers',
  },
];

function formatHeaderDate() {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return '';
  }
}

function weightDeltaText(entries: ReturnType<typeof loadBmiEntries>): string | null {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length < 2) return null;
  const latest = sorted[0]!;
  const older = sorted.find((e) => e.date < latest.date.slice(0, 8) + '01') ?? sorted[sorted.length - 1]!;
  if (older.id === latest.id) return null;
  const diff = latest.weightKg - older.weightKg;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}kg so với lần trước`;
}

const DASHBOARD_STYLES = `
  .tezca-dash-scrollbar::-webkit-scrollbar { width: 4px; }
  .tezca-dash-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .tezca-dash-scrollbar::-webkit-scrollbar-thumb { background: rgba(26, 32, 44, 0.2); border-radius: 4px; }
  @keyframes tezcaDashFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tezcaDashSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .tezca-animate-fade-in { animation: tezcaDashFadeIn 0.3s ease-out forwards; }
  .tezca-animate-slide-up { animation: tezcaDashSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
`;

export function PatientDashboardPage() {
  const { user, token, isAuthenticated, isAnonymous, isVerifying } = usePatientSession();

  const discipline = useDisciplineDataScope({ userId: user?.id ?? null, token });
  const {
    canSync,
    baseExercises,
    dailyProgress,
    setDailyProgress,
    foodLog,
    setFoodLog,
    trainingStatus,
    expertTrainingNote,
    syncState,
    pushProgress,
  } = discipline;

  const [foodInput, setFoodInput] = useState('');
  const [meatPick, setMeatPick] = useState<Extract<FoodEstimateResult, { kind: 'pick_meat' }> | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]!);
  const weekDays = useMemo(() => buildWeekDaysWithIso(), []);
  const [activeDay, setActiveDay] = useState(() => weekDays.find((d) => d.isToday)?.id ?? 1);

  const activeIso = useMemo(
    () => isoDateForWeekDayId(activeDay, weekDays),
    [activeDay, weekDays],
  );

  const exercises = useMemo(
    () => applyDayProgress(baseExercises, dailyProgress[activeIso]),
    [baseExercises, dailyProgress, activeIso],
  );
  const bmiList = useMemo(() => loadBmiEntries().sort((a, b) => b.date.localeCompare(a.date)), []);
  const latestBmi = bmiList[0];
  const weightDelta = weightDeltaText(bmiList);

  const todayFoodIso = todayIsoLocal();
  const todayFoodLog = useMemo(
    () => foodLogForDay(foodLog, todayFoodIso),
    [foodLog, todayFoodIso],
  );
  const targetNutrition = useMemo(
    () => resolveDailyNutritionTargets(latestBmi),
    [latestBmi],
  );
  const nutrition = useMemo(() => sumNutrition(todayFoodLog), [todayFoodLog]);
  const gam = deriveGamificationState();
  const streak = gam.stats.moodStreak;

  const completedCount = exercises.filter((ex) => ex.completed).length;
  const isAllDone = exercises.length > 0 && completedCount === exercises.length;

  useEffect(() => {
    if (isAllDone) {
      const timer = setTimeout(() => {
        const randomQ = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]!;
        setQuote(randomQ);
        setShowCelebration(true);
      }, 600);
      return () => clearTimeout(timer);
    }
    setShowCelebration(false);
  }, [isAllDone, exercises.length]);

  const appendFoodLog = (item: Omit<FoodLogItem, 'id' | 'dateIso'>) => {
    setFoodLog((prev) => [
      { ...item, id: Date.now(), dateIso: todayFoodIso },
      ...prev,
    ]);
  };

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = foodInput.trim();
    if (!raw) return;

    const analysis = analyzeFoodInput(raw);
    if (analysis.kind === 'pick_meat') {
      setMeatPick(analysis);
      return;
    }

    appendFoodLog({
      name: analysis.displayName || raw,
      pro: analysis.macros.pro,
      carb: analysis.macros.carb,
      cal: analysis.macros.cal,
    });
    setFoodInput('');
    setMeatPick(null);
  };

  const confirmMeatPick = (meatId: string) => {
    if (!meatPick) return;
    const result = estimateFromMeatId(meatPick.input, meatId);
    if (result.kind !== 'ready') return;
    appendFoodLog({
      name: result.displayName,
      pro: result.macros.pro,
      carb: result.macros.carb,
      cal: result.macros.cal,
    });
    setFoodInput('');
    setMeatPick(null);
  };

  const removeFood = (id: number) => {
    setFoodLog((prev) => prev.filter((f) => f.id !== id));
  };

  const updateDayExercises = useCallback(
    (nextDayList: DashboardExercise[], immediate: boolean) => {
      const dayPatch = extractDayProgress(nextDayList);
      setDailyProgress((prev) => ({ ...prev, [activeIso]: dayPatch }));
      pushProgress(activeIso, nextDayList, immediate);
    },
    [activeIso, pushProgress, setDailyProgress],
  );

  const toggleExercise = useCallback(
    (id: number) => {
      const next = exercises.map((ex) => (ex.id === id ? { ...ex, completed: !ex.completed } : ex));
      updateDayExercises(next, true);
    },
    [exercises, updateDayExercises],
  );

  const updateWeight = useCallback(
    (id: number, weight: string) => {
      const next = exercises.map((ex) => (ex.id === id ? { ...ex, actualWeight: weight } : ex));
      updateDayExercises(next, false);
    },
    [exercises, updateDayExercises],
  );

  const progressPct = exercises.length ? (completedCount / exercises.length) * 100 : 0;
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div
      className="-mx-6 -mt-6 md:-mx-10 md:-mt-10 min-h-[calc(100vh-1rem)] font-sans"
      style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}
    >
      <style dangerouslySetInnerHTML={{ __html: DASHBOARD_STYLES }} />

      <div className="p-4 md:p-8 flex flex-col items-center min-h-full">
        {isAnonymous && !isVerifying && (
          <div
            className="w-full max-w-6xl mb-6 rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            style={{
              borderColor: 'rgba(251, 191, 36, 0.5)',
              backgroundColor: 'rgba(254, 243, 199, 0.5)',
            }}
          >
            <p className="text-sm m-0" style={{ color: '#78350f' }}>
              Đăng nhập để lưu bài tập, dinh dưỡng và đồng bộ dữ liệu sức khỏe lên tài khoản Tezca.
            </p>
            <Link
              to={ROUTES.app.login}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white no-underline hover:opacity-90"
              style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
            >
              Đăng nhập
            </Link>
          </div>
        )}

        <header className="w-full max-w-6xl mb-6 md:mb-8 flex flex-wrap justify-between items-end gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest m-0 mb-1" style={{ color: tezcaTheme.accentDark }}>
              {isAuthenticated && firstName ? `Xin chào, ${firstName}` : 'Tezca'}
            </p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter m-0">
              TRUNG TÂM <span style={{ color: tezcaTheme.accent }}>KỶ LUẬT</span>
            </h1>
            <p className="mt-1 font-medium m-0 capitalize opacity-70">{formatHeaderDate()}</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs">
            {[
              { to: ROUTES.app.bmi, label: 'BMI' },
              { to: ROUTES.app.mood, label: 'Cảm xúc' },
              { to: ROUTES.app.chat, label: 'Tezca AI' },
              { to: ROUTES.app.plans, label: 'Kế hoạch' },
              { to: ROUTES.app.rewards, label: 'Phần thưởng' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3 py-1.5 rounded-lg border no-underline transition-colors hover:opacity-100 opacity-80"
                style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text, backgroundColor: tezcaTheme.surface }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="w-full max-w-6xl flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 md:gap-8 pb-8">
          <section className="min-h-[420px]">
            <div className="rounded-2xl p-6 border flex flex-col h-full" style={tezcaCardStyle}>
              <div className="flex items-center gap-3 mb-6">
                <Activity style={{ color: tezcaTheme.accent }} size={24} />
                <h2 className="text-xl font-black tracking-wide uppercase m-0">Dữ Liệu Cơ Thể</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-xl border" style={{ backgroundColor: tezcaTheme.subtleBg, borderColor: tezcaTheme.border }}>
                  <p className="text-sm font-medium mb-1 m-0 opacity-70">Cân Nặng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">
                      {latestBmi ? latestBmi.weightKg.toFixed(1) : '—'}
                    </span>
                    <span className="font-bold opacity-50">kg</span>
                  </div>
                  {weightDelta ? (
                    <p className="text-emerald-600 text-xs mt-2 flex items-center gap-1 m-0">
                      <TrendingDown size={12} />
                      {weightDelta}
                    </p>
                  ) : (
                    <Link
                      to={ROUTES.app.bmi}
                      className="text-xs mt-2 inline-block no-underline hover:underline font-medium"
                      style={{ color: tezcaTheme.accentDark }}
                    >
                      Thêm đo BMI →
                    </Link>
                  )}
                </div>
                <div className="p-4 rounded-xl border" style={{ backgroundColor: tezcaTheme.subtleBg, borderColor: tezcaTheme.border }}>
                  <p className="text-sm font-medium mb-1 m-0 opacity-70">Chỉ số BMI</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">{latestBmi ? latestBmi.bmi.toFixed(1) : '—'}</span>
                  </div>
                  <p className="text-xs mt-2 m-0" style={{ color: tezcaTheme.accentDark }}>
                    {latestBmi ? `Cập nhật ${latestBmi.date}` : 'Chưa có dữ liệu'}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="text-emerald-600" size={20} />
                    <h3 className="text-sm font-bold uppercase tracking-wider m-0 opacity-80">Trạm Nạp Năng Lượng</h3>
                  </div>
                  <span className="text-[10px] font-medium opacity-50 uppercase tracking-wide">Hôm nay</span>
                </div>
                {latestBmi && (
                  <p className="text-[11px] m-0 mb-3 opacity-60">
                    Mục tiêu theo cân nặng {latestBmi.weightKg.toFixed(1)} kg · BMI {latestBmi.bmi.toFixed(1)}
                  </p>
                )}

                <div className="mb-5 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium opacity-70">Calo Tổng</span>
                      <span className="text-emerald-600 font-bold">
                        {nutrition.cal} / {targetNutrition.cal} kcal
                      </span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: tezcaTheme.subtleBg }}>
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${nutritionProgressPct(nutrition.cal, targetNutrition.cal)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="opacity-70">Protein</span>
                        <span className="text-blue-600 font-bold">{nutrition.pro}g</span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: tezcaTheme.subtleBg }}>
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${nutritionProgressPct(nutrition.pro, targetNutrition.pro)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="opacity-70">Carb</span>
                        <span className="text-orange-600 font-bold">{nutrition.carb}g</span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: tezcaTheme.subtleBg }}>
                        <div
                          className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${nutritionProgressPct(nutrition.carb, targetNutrition.carb)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <MeatCatalogReference />

                {meatPick && (
                  <MeatTypePicker
                    input={meatPick.input}
                    grams={meatPick.grams}
                    options={meatPick.options}
                    onSelect={confirmMeatPick}
                    onCancel={() => setMeatPick(null)}
                  />
                )}

                <form onSubmit={handleAddFood} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="VD: 200g ức gà · 150g heo nạc · gà (chọn loại)"
                    value={foodInput}
                    onChange={(e) => setFoodInput(e.target.value)}
                    className="flex-1 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors border"
                    style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
                  />
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-black p-2 rounded-xl transition-colors font-bold flex items-center justify-center w-10 h-10 shrink-0 border-0 cursor-pointer"
                    aria-label="Thêm món ăn"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 tezca-dash-scrollbar min-h-[100px] max-h-[140px]">
                  {todayFoodLog.length === 0 ? (
                    <p className="text-xs opacity-50 m-0 px-1">Chưa ghi món hôm nay.</p>
                  ) : (
                    todayFoodLog.map((food) => (
                      <div
                        key={food.id}
                        className="flex justify-between items-center gap-2 p-2.5 rounded-lg border text-sm tezca-animate-fade-in"
                        style={{ backgroundColor: tezcaTheme.subtleBg, borderColor: tezcaTheme.border }}
                      >
                        <span className="font-medium truncate min-w-0 flex-1">{food.name}</span>
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          <span className="text-blue-600">{food.pro}g P</span>
                          <span className="text-orange-600">{food.carb}g C</span>
                          <span className="text-emerald-600 font-bold">{food.cal}</span>
                          <button
                            type="button"
                            onClick={() => removeFood(food.id)}
                            className="p-1 rounded-md border-0 cursor-pointer opacity-50 hover:opacity-100"
                            style={{ color: tezcaTheme.text }}
                            aria-label={`Xóa ${food.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div
                className="mt-auto rounded-xl p-4 border"
                style={{
                  background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.08) 0%, rgba(20, 184, 166, 0.04) 100%)',
                  borderColor: 'rgba(45, 212, 191, 0.25)',
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium m-0 opacity-70">Chuỗi Kỷ Luật (Streak)</p>
                    <p className="text-2xl font-black mt-1 m-0">
                      {streak > 0 ? streak : '—'} {streak > 0 ? 'Ngày' : ''}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/30">
                    <Flame className="text-orange-500" size={20} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="min-h-[480px]">
            <div className="rounded-2xl p-6 border flex flex-col h-full relative overflow-hidden" style={tezcaCardStyle}>
              <div
                className={`absolute inset-0 bg-green-500/5 transition-opacity duration-1000 pointer-events-none ${isAllDone ? 'opacity-100' : 'opacity-0'}`}
              />

              <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                  <h2 className="text-xl font-black tracking-wide uppercase m-0">Chiến Dịch Tập Luyện</h2>
                  <p className="text-sm mt-1 m-0 opacity-70">
                    Cấp {gam.level} · {gam.xp} XP ·{' '}
                    {weekDays.find((d) => d.id === activeDay)?.label ?? '—'}{' '}
                    {weekDays.find((d) => d.id === activeDay)?.isToday ? '(hôm nay)' : ''}
                    {trainingStatus === 'pending_review' && (
                      <span className="block text-amber-700 text-xs mt-1">Chờ chuyên gia duyệt kế hoạch</span>
                    )}
                    {trainingStatus === 'approved' && expertTrainingNote && (
                      <span className="block text-xs mt-1" style={{ color: tezcaTheme.accentDark }}>
                        {expertTrainingNote}
                      </span>
                    )}
                    {canSync && syncState === 'syncing' && (
                      <span className="block text-xs mt-1 opacity-50">Đang lưu tiến độ…</span>
                    )}
                    {canSync && syncState === 'error' && (
                      <span className="block text-rose-600 text-xs mt-1">Không lưu được tiến độ — thử lại sau</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black">{completedCount}</span>
                  <span className="font-bold opacity-50">/{exercises.length}</span>
                </div>
              </div>

              <div
                className="flex justify-between items-center mb-6 relative z-10 p-2 rounded-2xl border"
                style={{ backgroundColor: tezcaTheme.subtleBg, borderColor: tezcaTheme.border }}
              >
                {weekDays.map((day) => {
                  const { done, total } = countDayDone(baseExercises, dailyProgress[day.isoDate]);
                  const allDone = total > 0 && done === total;
                  const partial = done > 0 && !allDone;
                  return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setActiveDay(day.id)}
                    className={`flex flex-col items-center justify-center w-[13%] aspect-[3/4] rounded-xl transition-all border-0 cursor-pointer ${
                      activeDay === day.id
                        ? 'scale-110 z-10 shadow-md'
                        : 'hover:opacity-100 opacity-60 bg-transparent'
                    }`}
                    style={
                      activeDay === day.id
                        ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                        : undefined
                    }
                  >
                    <span
                      className={`text-[10px] md:text-xs font-bold uppercase mb-0.5 ${activeDay === day.id ? 'opacity-70' : 'opacity-50'}`}
                    >
                      {day.label}
                    </span>
                    <span className="text-base md:text-lg font-black">
                      {day.date}
                    </span>
                    {(day.isToday || allDone || partial) && (
                      <div
                        className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full mt-1 ${
                          allDone
                            ? 'bg-green-500'
                            : partial
                              ? 'bg-orange-400'
                              : activeDay === day.id
                                ? 'bg-white'
                                : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </button>
                  );
                })}
              </div>

              <div className="w-full rounded-full h-1.5 mb-6 relative z-10" style={{ backgroundColor: tezcaTheme.subtleBg }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ background: tezcaTheme.accentGradient, width: `${progressPct}%` }}
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative z-10 tezca-dash-scrollbar min-h-0">
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                      ex.completed ? 'opacity-60' : ''
                    }`}
                    style={{
                      backgroundColor: tezcaTheme.surface,
                      borderColor: ex.isPTLocked && !ex.completed ? 'rgba(45, 212, 191, 0.35)' : tezcaTheme.border,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExercise(ex.id)}
                      className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                        ex.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 text-transparent hover:border-emerald-500 bg-transparent'
                      }`}
                      aria-label={ex.completed ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-bold truncate m-0 text-base ${ex.completed ? 'opacity-50 line-through' : ''}`}
                        >
                          {ex.title}
                        </h3>
                        {ex.isPTLocked && !ex.completed && (
                          <Lock className="shrink-0" size={16} style={{ color: tezcaTheme.accent }} />
                        )}
                      </div>
                      <p className="text-sm font-medium mt-0.5 m-0 opacity-60">
                        {ex.sets} Hiệp x {ex.reps}
                      </p>
                    </div>

                    <div className="w-24 shrink-0">
                      <input
                        type="text"
                        placeholder="Tạ..."
                        value={ex.actualWeight}
                        onChange={(e) => updateWeight(ex.id, e.target.value)}
                        disabled={ex.completed}
                        className={`w-full text-center text-sm font-bold border rounded-lg py-2 outline-none transition-colors ${
                          ex.isPTLocked && !ex.completed ? 'focus:border-teal-500' : 'focus:border-slate-400'
                        } ${ex.completed ? 'opacity-50' : ''}`}
                        style={{
                          backgroundColor: tezcaTheme.bg,
                          borderColor: ex.isPTLocked && !ex.completed ? 'rgba(45, 212, 191, 0.35)' : tezcaTheme.borderStrong,
                          color: tezcaTheme.text,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 tezca-animate-fade-in">
            <button
              type="button"
              className="absolute inset-0 backdrop-blur-sm border-0 cursor-default"
              style={{ backgroundColor: 'rgba(26, 32, 44, 0.45)' }}
              aria-label="Đóng"
              onClick={() => setShowCelebration(false)}
            />
            <div
              className="relative border rounded-2xl p-8 max-w-lg w-full text-center tezca-animate-slide-up"
              style={{
                ...tezcaCardStyle,
                borderColor: 'rgba(45, 212, 191, 0.35)',
                boxShadow: '0 24px 80px -24px rgba(45, 212, 191, 0.25)',
              }}
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
                style={{ backgroundColor: tezcaTheme.accentLight }}
              />
              <div className="flex justify-center mb-6 relative">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center border-2"
                  style={{ backgroundColor: 'rgba(45, 212, 191, 0.12)', borderColor: 'rgba(45, 212, 191, 0.35)' }}
                >
                  <Trophy style={{ color: tezcaTheme.accent }} size={48} />
                </div>
              </div>
              <h2 className="text-3xl font-black mb-2 uppercase tracking-wide m-0">Chiến Dịch Hoàn Tất!</h2>
              <p className="text-emerald-600 font-bold mb-8 m-0">Bạn đã cộng thêm +1 ngày vào chuỗi Kỷ Luật.</p>
              <div
                className="rounded-xl p-6 border-l-4 relative mb-8 text-left"
                style={{ backgroundColor: tezcaTheme.subtleBg, borderLeftColor: tezcaTheme.accent }}
              >
                <Quote className="absolute top-2 left-2 w-8 h-8 opacity-20" />
                <p className="font-medium italic text-lg leading-relaxed relative z-10 pl-6 m-0 opacity-90">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className="font-bold mt-4 text-right pr-2 m-0" style={{ color: tezcaTheme.accentDark }}>
                  — {quote.author}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCelebration(false)}
                className="w-full font-black py-4 rounded-xl transition-transform active:scale-95 uppercase tracking-wider border-0 cursor-pointer text-white hover:opacity-90"
                style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
              >
                Đóng bảng vinh danh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
