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
  Trophy,
  UtensilsCrossed,
} from 'lucide-react';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { deriveGamificationState } from '../../lib/gamification';
import { loadBmiEntries } from '../../lib/healthStorage';
import {
  estimateMacrosFromInput,
  getTargetNutrition,
  loadDashboardExercises,
  loadFoodLog,
  saveDashboardExercises,
  saveFoodLog,
  sumNutrition,
  type DashboardExercise,
  type FoodLogItem,
} from '../../lib/dashboardStorage';
import { ROUTES } from '../../routes';

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

function buildWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const ids = [1, 2, 3, 4, 5, 6, 0];
  return ids.map((id, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      id,
      label: labels[i]!,
      date: String(d.getDate()),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

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
  .tezca-dash-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
  @keyframes tezcaDashFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tezcaDashSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .tezca-animate-fade-in { animation: tezcaDashFadeIn 0.3s ease-out forwards; }
  .tezca-animate-slide-up { animation: tezcaDashSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
`;

export function PatientDashboardPage() {
  const { user, token, sessionReady } = usePatientAuth();
  const userId = user?.id ?? null;
  const isLoggedIn = Boolean(token && user);

  const [exercises, setExercises] = useState<DashboardExercise[]>(() => loadDashboardExercises(userId));
  const [foodLog, setFoodLog] = useState<FoodLogItem[]>(() => loadFoodLog(userId));
  const [foodInput, setFoodInput] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]!);
  const [activeDay, setActiveDay] = useState(() => buildWeekDays().find((d) => d.isToday)?.id ?? 1);

  const weekDays = useMemo(() => buildWeekDays(), []);
  const targetNutrition = getTargetNutrition();
  const nutrition = useMemo(() => sumNutrition(foodLog), [foodLog]);
  const gam = deriveGamificationState();
  const streak = gam.stats.moodStreak;

  const bmiList = useMemo(() => loadBmiEntries().sort((a, b) => b.date.localeCompare(a.date)), []);
  const latestBmi = bmiList[0];
  const weightDelta = weightDeltaText(bmiList);

  useEffect(() => {
    setExercises(loadDashboardExercises(userId));
    setFoodLog(loadFoodLog(userId));
  }, [userId]);

  useEffect(() => {
    saveDashboardExercises(userId, exercises);
  }, [exercises, userId]);

  useEffect(() => {
    saveFoodLog(userId, foodLog);
  }, [foodLog, userId]);

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

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodInput.trim()) return;
    const est = estimateMacrosFromInput(foodInput);
    const newFood: FoodLogItem = {
      id: Date.now(),
      name: foodInput.trim(),
      pro: est.pro,
      carb: est.carb,
      cal: est.cal,
    };
    setFoodLog((prev) => [newFood, ...prev]);
    setFoodInput('');
  };

  const toggleExercise = useCallback((id: number) => {
    setExercises((list) => list.map((ex) => (ex.id === id ? { ...ex, completed: !ex.completed } : ex)));
  }, []);

  const updateWeight = useCallback((id: number, weight: string) => {
    setExercises((list) => list.map((ex) => (ex.id === id ? { ...ex, actualWeight: weight } : ex)));
  }, []);

  const progressPct = exercises.length ? (completedCount / exercises.length) * 100 : 0;
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="-mx-6 -mt-6 md:-mx-10 md:-mt-10 min-h-[calc(100vh-1rem)] bg-black text-gray-100 font-sans">
      <style dangerouslySetInnerHTML={{ __html: DASHBOARD_STYLES }} />

      <div className="p-4 md:p-8 flex flex-col items-center min-h-full">
        {!sessionReady && token ? (
          <p className="text-gray-400 text-sm mb-4">Đang tải tài khoản…</p>
        ) : null}

        {!isLoggedIn && sessionReady && (
          <div className="w-full max-w-6xl mb-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-yellow-100 m-0">
              Đăng nhập để lưu bài tập, dinh dưỡng và đồng bộ dữ liệu sức khỏe lên tài khoản Tezca.
            </p>
            <Link
              to={ROUTES.app.login}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-yellow-500 text-black no-underline hover:bg-yellow-400"
            >
              Đăng nhập
            </Link>
          </div>
        )}

        <header className="w-full max-w-6xl mb-6 md:mb-8 flex flex-wrap justify-between items-end gap-4">
          <div>
            <p className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest m-0 mb-1">
              {isLoggedIn && firstName ? `Xin chào, ${firstName}` : 'Tezca'}
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter m-0">
              TRUNG TÂM <span className="text-yellow-500">KỶ LUẬT</span>
            </h1>
            <p className="text-gray-400 mt-1 font-medium m-0 capitalize">{formatHeaderDate()}</p>
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
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 no-underline hover:border-yellow-500/50 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="w-full max-w-6xl flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 md:gap-8 pb-8">
          <section className="min-h-[420px]">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col h-full shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="text-blue-400" size={24} />
                <h2 className="text-xl font-black text-white tracking-wide uppercase m-0">Dữ Liệu Cơ Thể</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                  <p className="text-gray-400 text-sm font-medium mb-1 m-0">Cân Nặng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      {latestBmi ? latestBmi.weightKg.toFixed(1) : '—'}
                    </span>
                    <span className="text-gray-500 font-bold">kg</span>
                  </div>
                  {weightDelta ? (
                    <p className="text-green-400 text-xs mt-2 flex items-center gap-1 m-0">
                      <TrendingDown size={12} />
                      {weightDelta}
                    </p>
                  ) : (
                    <Link to={ROUTES.app.bmi} className="text-yellow-500/90 text-xs mt-2 inline-block no-underline hover:underline">
                      Thêm đo BMI →
                    </Link>
                  )}
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                  <p className="text-gray-400 text-sm font-medium mb-1 m-0">Chỉ số BMI</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{latestBmi ? latestBmi.bmi.toFixed(1) : '—'}</span>
                  </div>
                  <p className="text-yellow-400 text-xs mt-2 m-0">
                    {latestBmi ? `Cập nhật ${latestBmi.date}` : 'Chưa có dữ liệu'}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-4">
                  <UtensilsCrossed className="text-emerald-400" size={20} />
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider m-0">Trạm Nạp Năng Lượng</h3>
                </div>

                <div className="mb-5 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 font-medium">Calo Tổng</span>
                      <span className="text-emerald-400 font-bold">
                        {nutrition.cal} / {targetNutrition.cal} kcal
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((nutrition.cal / targetNutrition.cal) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Protein</span>
                        <span className="text-blue-400 font-bold">{nutrition.pro}g</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((nutrition.pro / targetNutrition.pro) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Carb</span>
                        <span className="text-orange-400 font-bold">{nutrition.carb}g</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((nutrition.carb / targetNutrition.carb) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddFood} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Nhập món (VD: 200g ức gà...)"
                    value={foodInput}
                    onChange={(e) => setFoodInput(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-black p-2 rounded-xl transition-colors font-bold flex items-center justify-center w-10 h-10 shrink-0 border-0 cursor-pointer"
                    aria-label="Thêm món ăn"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 tezca-dash-scrollbar min-h-[100px] max-h-[120px]">
                  {foodLog.map((food) => (
                    <div
                      key={food.id}
                      className="flex justify-between items-center bg-gray-800/50 p-2.5 rounded-lg border border-gray-700/30 text-sm tezca-animate-fade-in"
                    >
                      <span className="text-gray-200 font-medium truncate pr-2">{food.name}</span>
                      <div className="flex gap-3 text-xs shrink-0">
                        <span className="text-blue-400">{food.pro}g P</span>
                        <span className="text-emerald-400 font-bold">{food.cal} cal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-400 font-medium m-0">Chuỗi Kỷ Luật (Streak)</p>
                    <p className="text-2xl font-black text-white mt-1 m-0">
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
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col h-full relative overflow-hidden shadow-2xl">
              <div
                className={`absolute inset-0 bg-green-500/5 transition-opacity duration-1000 pointer-events-none ${isAllDone ? 'opacity-100' : 'opacity-0'}`}
              />

              <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide uppercase m-0">Chiến Dịch Tập Luyện</h2>
                  <p className="text-gray-400 text-sm mt-1 m-0">
                    Cấp {gam.level} · {gam.xp} XP · Hôm nay
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-white">{completedCount}</span>
                  <span className="text-gray-500 font-bold">/{exercises.length}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6 relative z-10 bg-gray-800/50 p-2 rounded-2xl border border-gray-700/50">
                {weekDays.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setActiveDay(day.id)}
                    className={`flex flex-col items-center justify-center w-[13%] aspect-[3/4] rounded-xl transition-all border-0 cursor-pointer ${
                      activeDay === day.id
                        ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-110 z-10'
                        : 'hover:bg-gray-700 text-gray-400 bg-transparent'
                    }`}
                  >
                    <span
                      className={`text-[10px] md:text-xs font-bold uppercase mb-0.5 ${activeDay === day.id ? 'text-black/70' : 'text-gray-500'}`}
                    >
                      {day.label}
                    </span>
                    <span className={`text-base md:text-lg font-black ${activeDay === day.id ? 'text-black' : 'text-white'}`}>
                      {day.date}
                    </span>
                    {day.isToday && (
                      <div
                        className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full mt-1 ${activeDay === day.id ? 'bg-black' : 'bg-yellow-500'}`}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="w-full bg-gray-800 rounded-full h-1.5 mb-6 relative z-10">
                <div
                  className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative z-10 tezca-dash-scrollbar min-h-0">
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                      ex.completed
                        ? 'bg-gray-800/30 border-gray-700 opacity-60'
                        : ex.isPTLocked
                          ? 'bg-gray-800 border-yellow-500/30 hover:border-yellow-500/60'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExercise(ex.id)}
                      className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                        ex.completed
                          ? 'bg-green-500 border-green-500 text-gray-900'
                          : 'border-gray-500 text-transparent hover:border-white bg-transparent'
                      }`}
                      aria-label={ex.completed ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-bold truncate m-0 text-base ${ex.completed ? 'text-gray-400 line-through' : 'text-gray-100'}`}
                        >
                          {ex.title}
                        </h3>
                        {ex.isPTLocked && !ex.completed && <Lock className="text-yellow-500 shrink-0" size={16} />}
                      </div>
                      <p className="text-sm text-gray-500 font-medium mt-0.5 m-0">
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
                        className={`w-full text-center text-sm font-bold bg-gray-900 border rounded-lg py-2 outline-none transition-colors ${
                          ex.isPTLocked && !ex.completed
                            ? 'border-yellow-500/30 focus:border-yellow-500'
                            : 'border-gray-700 focus:border-gray-500'
                        } ${ex.completed ? 'text-gray-500' : 'text-white'}`}
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
              className="absolute inset-0 bg-black/80 backdrop-blur-sm border-0 cursor-default"
              aria-label="Đóng"
              onClick={() => setShowCelebration(false)}
            />
            <div className="relative bg-gray-900 border border-yellow-500/50 rounded-2xl p-8 max-w-lg w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.15)] tezca-animate-slide-up">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-center mb-6 relative">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center border-2 border-yellow-500/30">
                  <Trophy className="text-yellow-400" size={48} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide m-0">Chiến Dịch Hoàn Tất!</h2>
              <p className="text-green-400 font-bold mb-8 m-0">Bạn đã cộng thêm +1 ngày vào chuỗi Kỷ Luật.</p>
              <div className="bg-gray-800/80 rounded-xl p-6 border-l-4 border-yellow-500 relative mb-8 text-left">
                <Quote className="absolute top-2 left-2 w-8 h-8 text-gray-700 opacity-50" />
                <p className="text-gray-300 font-medium italic text-lg leading-relaxed relative z-10 pl-6 m-0">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className="text-yellow-500 font-bold mt-4 text-right pr-2 m-0">— {quote.author}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCelebration(false)}
                className="w-full bg-white hover:bg-gray-200 text-black font-black py-4 rounded-xl transition-transform active:scale-95 uppercase tracking-wider border-0 cursor-pointer"
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
