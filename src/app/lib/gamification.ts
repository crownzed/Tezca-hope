import { loadAiChat, loadBmiEntries, loadMoodEntries } from './healthStorage';

const PLAN_COUNT_KEY = 'tezca_gamification_plan_count_v1';
const XP_PER_LEVEL = 200;
const MAX_LEVEL = 20;

export type ActivityStats = {
  bmiCount: number;
  moodCount: number;
  userChatMessages: number;
  moodStreak: number;
  plansGenerated: number;
};

export function getPlanGenerationCount(): number {
  return Math.min(999, Number(localStorage.getItem(PLAN_COUNT_KEY) || 0));
}

/** Gọi sau mỗi lần người dùng sinh kế hoạch thành công (AI hoặc cục bộ). */
export function recordPlanGenerated(): void {
  const n = getPlanGenerationCount() + 1;
  localStorage.setItem(PLAN_COUNT_KEY, String(n));
  window.dispatchEvent(new CustomEvent('tezca-gamification-update'));
}

export function computeCurrentMoodStreak(dateStrings: string[]): number {
  const set = new Set(dateStrings.map((d) => d.slice(0, 10)));
  const pad = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let start = new Date(today);
  if (!set.has(pad(start))) {
    start.setDate(start.getDate() - 1);
    if (!set.has(pad(start))) return 0;
  }
  let n = 0;
  const cur = new Date(start);
  while (set.has(pad(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

export type BadgeDef = {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
};

export const BADGE_DEFINITIONS: (BadgeDef & { predicate: (s: ActivityStats) => boolean })[] = [
  {
    id: 'first_bmi',
    title: 'Bước đầu tiên',
    description: 'Ghi nhận ít nhất một lần đo BMI.',
    xpBonus: 30,
    predicate: (s) => s.bmiCount >= 1,
  },
  {
    id: 'steady_bmi',
    title: 'Theo dõi đều',
    description: 'Có 5 lần ghi BMI trở lên.',
    xpBonus: 80,
    predicate: (s) => s.bmiCount >= 5,
  },
  {
    id: 'mood_start',
    title: 'Mở lòng',
    description: 'Ghi ít nhất một nhật ký cảm xúc.',
    xpBonus: 25,
    predicate: (s) => s.moodCount >= 1,
  },
  {
    id: 'mood_habit',
    title: 'Thói quen tích cực',
    description: '10 bản ghi cảm xúc trở lên.',
    xpBonus: 100,
    predicate: (s) => s.moodCount >= 10,
  },
  {
    id: 'streak_3',
    title: 'Chuỗi 3 ngày',
    description: 'Ghi cảm xúc 3 ngày liên tiếp (tính đến hôm nay hoặc hôm qua).',
    xpBonus: 60,
    predicate: (s) => s.moodStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Tuần lửa',
    description: 'Chuỗi 7 ngày liên tiếp.',
    xpBonus: 200,
    predicate: (s) => s.moodStreak >= 7,
  },
  {
    id: 'chat_explorer',
    title: 'Khởi động hội thoại',
    description: 'Gửi ít nhất 10 tin nhắn (vai trò người dùng) trong Chat AI.',
    xpBonus: 50,
    predicate: (s) => s.userChatMessages >= 10,
  },
  {
    id: 'chat_companion',
    title: 'Người bạn đồng hành',
    description: '40 tin nhắn người dùng trong Chat AI.',
    xpBonus: 150,
    predicate: (s) => s.userChatMessages >= 40,
  },
  {
    id: 'plan_once',
    title: 'Có kế hoạch',
    description: 'Sinh kế hoạch dinh dưỡng & tập ít nhất một lần.',
    xpBonus: 40,
    predicate: (s) => s.plansGenerated >= 1,
  },
  {
    id: 'plan_builder',
    title: 'Kiến trúc sư sức khỏe',
    description: 'Sinh kế hoạch 5 lần trở lên.',
    xpBonus: 120,
    predicate: (s) => s.plansGenerated >= 5,
  },
];

function computeXpFromStats(s: ActivityStats): number {
  const chatCap = Math.min(s.userChatMessages, 80);
  const raw =
    s.bmiCount * 14 +
    s.moodCount * 10 +
    chatCap * 3 +
    s.moodStreak * 12 +
    s.plansGenerated * 32;
  return Math.min(4200, Math.round(raw));
}

export type GamificationState = {
  stats: ActivityStats;
  xp: number;
  level: number;
  xpIntoLevel: number;
  progressInLevel: number;
  badges: (BadgeDef & { unlocked: boolean })[];
  unlockedBadgeIds: string[];
  unlockedCount: number;
};

export function deriveGamificationState(): GamificationState {
  const bmi = loadBmiEntries();
  const moods = loadMoodEntries();
  const chat = loadAiChat(
    typeof localStorage !== 'undefined'
      ? (() => {
          try {
            const raw = localStorage.getItem('tezca_patient_user');
            if (!raw) return null;
            return (JSON.parse(raw) as { id?: string }).id ?? null;
          } catch {
            return null;
          }
        })()
      : null,
  );
  const moodDates = moods.map((m) => m.date);
  const streak = computeCurrentMoodStreak(moodDates);
  const userChatMessages = chat.filter((m) => m.role === 'user').length;

  const stats: ActivityStats = {
    bmiCount: bmi.length,
    moodCount: moods.length,
    userChatMessages,
    moodStreak: streak,
    plansGenerated: getPlanGenerationCount(),
  };

  const xp = computeXpFromStats(stats);
  const level = Math.min(MAX_LEVEL, Math.max(1, 1 + Math.floor(xp / XP_PER_LEVEL)));
  const floorXp = (level - 1) * XP_PER_LEVEL;
  let xpIntoLevel: number;
  if (level >= MAX_LEVEL) {
    xpIntoLevel = XP_PER_LEVEL;
  } else {
    xpIntoLevel = Math.min(XP_PER_LEVEL, Math.max(0, xp - floorXp));
  }
  const progressInLevel = level >= MAX_LEVEL ? 1 : xpIntoLevel / XP_PER_LEVEL;

  const badges = BADGE_DEFINITIONS.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    xpBonus: b.xpBonus,
    unlocked: b.predicate(stats),
  }));

  const unlockedBadgeIds = badges.filter((b) => b.unlocked).map((b) => b.id);

  return {
    stats,
    xp,
    level,
    xpIntoLevel,
    progressInLevel,
    badges,
    unlockedBadgeIds,
    unlockedCount: unlockedBadgeIds.length,
  };
}
