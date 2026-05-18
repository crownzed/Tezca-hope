import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  Star,
  Target,
  Footprints,
  Heart,
  MessageCircle,
  ClipboardList,
  Award,
  Sparkles,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { deriveGamificationState, type GamificationState } from '../../lib/gamification';
import { ROUTES } from '../../routes';

const BADGE_ICONS: Record<string, LucideIcon> = {
  first_bmi: Footprints,
  steady_bmi: Target,
  mood_start: Heart,
  mood_habit: Heart,
  streak_3: Flame,
  streak_7: Flame,
  chat_explorer: MessageCircle,
  chat_companion: MessageCircle,
  plan_once: ClipboardList,
  plan_builder: Award,
};

const SNAPSHOT_KEY = 'tezca_gamification_badge_snapshot_v1';

const TIPS = [
  'Mỗi lần ghi BMI hoặc cảm xúc là một điểm cộng cho “phiên bản khỏe hơn” của bạn — không cần hoàn hảo.',
  'Chuỗi ngày ghi nhật ký giúp não bộ tạo thói quen; đứt một ngày không sao — hãy bắt đầu lại.',
  'Chat AI và kế hoạch chỉ là công cụ; động lực bền đến từ những “thắng nhỏ” mỗi tuần.',
];

export function RewardsPage() {
  const [tick, setTick] = useState(0);
  const state = useMemo(() => deriveGamificationState(), [tick]);

  useEffect(() => {
    const prev: string[] = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
    const nextIds = deriveGamificationState().unlockedBadgeIds;
    const brandNew = nextIds.filter((id) => !prev.includes(id));
    if (brandNew.length > 0) {
      confetti({
        particleCount: Math.min(140, 60 + brandNew.length * 25),
        spread: 68,
        origin: { y: 0.58 },
        colors: ['#2DD4BF', '#14B8A6', '#5EEAD4', '#FBBF24', '#FFFFFF'],
      });
    }
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextIds));
  }, []);

  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener('storage', onStorage);
    const onGamification = () => setTick((t) => t + 1);
    window.addEventListener('tezca-gamification-update', onGamification);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('tezca-gamification-update', onGamification);
    };
  }, []);

  const quoteIndex = useMemo(() => new Date().getDate() % TIPS.length, []);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight m-0" style={{ color: '#1A202C' }}>
            Phần thưởng &amp; động lực
          </h1>
          <p className="mt-2 opacity-70 m-0 max-w-xl" style={{ color: '#1A202C' }}>
            Điểm kinh nghiệm và huy hiệu được tính từ dữ liệu trên thiết bị của bạn (BMI, nhật ký, chat AI, kế hoạch).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          className="text-sm font-medium opacity-70 hover:opacity-100 self-start sm:self-auto"
          style={{ color: '#0F766E' }}
        >
          Làm mới thống kê
        </button>
      </div>

      <LevelHero state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <StreakCard streak={state.stats.moodStreak} />
        <MotivationCard quote={TIPS[quoteIndex]} />
      </div>

      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2 m-0 mb-4" style={{ color: '#1A202C' }}>
          <Trophy size={22} style={{ color: '#14B8A6' }} />
          Huy hiệu
          <span className="text-sm font-normal opacity-60">
            ({state.unlockedCount}/{state.badges.length})
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.badges.map((b) => {
            const Icon = BADGE_ICONS[b.id] ?? Star;
            const locked = !b.unlocked;
            return (
              <div
                key={b.id}
                className="rounded-2xl border p-5 transition-all"
                style={{
                  borderColor: locked ? 'rgba(26, 32, 44, 0.06)' : 'rgba(45, 212, 191, 0.35)',
                  backgroundColor: locked ? 'rgba(26, 32, 44, 0.02)' : 'rgba(45, 212, 191, 0.06)',
                  opacity: locked ? 0.72 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: locked
                        ? 'rgba(26, 32, 44, 0.06)'
                        : 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                    }}
                  >
                    {locked ? (
                      <Lock size={22} style={{ color: '#94A3B8' }} />
                    ) : (
                      <Icon size={22} style={{ color: '#1A202C' }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm m-0 leading-snug" style={{ color: '#1A202C' }}>
                      {b.title}
                    </p>
                    <p className="text-xs mt-1 opacity-75 m-0 leading-relaxed" style={{ color: '#1A202C' }}>
                      {b.description}
                    </p>
                    <p className="text-xs mt-2 font-medium m-0" style={{ color: '#0F766E' }}>
                      +{b.xpBonus} XP khi mở khóa
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="rounded-2xl border p-6 md:p-8"
        style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 m-0 mb-4" style={{ color: '#1A202C' }}>
          <Sparkles size={22} style={{ color: '#14B8A6' }} />
          Gợi ý hành động
        </h2>
        <ul className="space-y-3 m-0 p-0 list-none text-sm opacity-90" style={{ color: '#1A202C' }}>
          <li className="flex gap-2">
            <ChevronRight size={18} className="shrink-0 opacity-40 mt-0.5" />
            Ghi nhật ký cảm xúc <strong className="font-semibold">mỗi tối</strong> — giữ chuỗi ngày và điểm XP.
          </li>
          <li className="flex gap-2">
            <ChevronRight size={18} className="shrink-0 opacity-40 mt-0.5" />
            Đo BMI <strong className="font-semibold">cùng khung giờ</strong> 1–2 lần/tuần để thấy xu hướng rõ hơn.
          </li>
          <li className="flex gap-2">
            <ChevronRight size={18} className="shrink-0 opacity-40 mt-0.5" />
            Dùng <Link to={ROUTES.app.plans} style={{ color: '#0F766E', fontWeight: 600 }}>Kế hoạch</Link> để sinh bản
            phác thảo khi đổi mục tiêu — mỗi lần sinh đều được ghi nhận.
          </li>
          <li className="flex gap-2">
            <ChevronRight size={18} className="shrink-0 opacity-40 mt-0.5" />
            Hỏi Chat AI về <strong className="font-semibold">giấc ngủ hoặc dinh dưỡng</strong> — mỗi tin nhắn đều là đầu tư
            cho thói quen.
          </li>
        </ul>
      </section>

      <p className="text-xs opacity-55 text-center m-0 max-w-lg mx-auto leading-relaxed" style={{ color: '#1A202C' }}>
        Gamification chỉ mang tính khích lệ; không thay cho chỉ định y tế. Đồng bộ đăng nhập để chuyên gia xem xu hướng khi
        được gán.
      </p>
    </div>
  );
}

function LevelHero({ state }: { state: GamificationState }) {
  const { level, xp, xpIntoLevel, progressInLevel } = state;
  const maxed = level >= 20;
  const pct = Math.round(progressInLevel * 100);

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 45%, #2DD4BF 100%)',
        boxShadow: '0 24px 80px -24px rgba(20, 184, 166, 0.45)',
      }}
    >
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl pointer-events-none bg-white" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 border border-white/25"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Trophy size={40} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium opacity-90 m-0">Cấp độ Tezca</p>
            <p className="text-4xl md:text-5xl font-bold m-0 mt-1 tabular-nums">{level}</p>
            <p className="text-sm opacity-85 m-0 mt-2">
              Tổng <strong>{xp}</strong> XP
              {maxed ? ' · Đã đạt cấp tối đa hiển thị' : ''}
            </p>
          </div>
        </div>
        <div className="flex-1 max-w-md w-full">
          <div className="flex justify-between text-xs opacity-90 mb-2">
            <span>Tiến độ cấp</span>
            <span>
              {maxed ? 'MAX' : `${xpIntoLevel} / 200 XP`}
            </span>
          </div>
          <div className="h-3 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${maxed ? 100 : pct}%`,
                background: 'linear-gradient(90deg, #fff 0%, #ECFDF5 100%)',
              }}
            />
          </div>
          {!maxed && (
            <p className="text-xs opacity-80 mt-2 m-0">
              Còn khoảng <strong>{Math.max(0, 200 - xpIntoLevel)}</strong> XP để lên cấp {level + 1}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StreakCard({ streak }: { streak: number }) {
  return (
    <div
      className="rounded-2xl border p-6 flex items-center gap-4"
      style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(251, 113, 133, 0.15) 100%)' }}
      >
        <Flame size={28} style={{ color: '#EA580C' }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-50 m-0" style={{ color: '#1A202C' }}>
          Chuỗi nhật ký cảm xúc
        </p>
        <p className="text-2xl font-bold m-0 mt-1 tabular-nums" style={{ color: '#1A202C' }}>
          {streak} ngày
        </p>
        <p className="text-xs opacity-65 m-0 mt-1">Tính liên tiếp từ hôm nay hoặc hôm qua.</p>
      </div>
    </div>
  );
}

function MotivationCard({ quote }: { quote: string }) {
  return (
    <div
      className="rounded-2xl border p-6 flex gap-4"
      style={{
        backgroundColor: 'rgba(45, 212, 191, 0.08)',
        borderColor: 'rgba(45, 212, 191, 0.25)',
      }}
    >
      <Sparkles className="shrink-0 mt-1" size={24} style={{ color: '#0F766E' }} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 m-0" style={{ color: '#1A202C' }}>
          Gợi ý động lực hôm nay
        </p>
        <p className="text-sm leading-relaxed m-0 mt-2 opacity-90" style={{ color: '#1A202C' }}>
          {quote}
        </p>
      </div>
    </div>
  );
}
