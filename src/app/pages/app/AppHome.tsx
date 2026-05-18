import { Link } from 'react-router';
import { Scale, Heart, MessageCircle, ClipboardList, ArrowRight, Trophy, Stethoscope } from 'lucide-react';
import { ROUTES } from '../../routes';
import {
  loadBmiEntries,
  loadMoodEntries,
  loadAiChat,
  bmiCategory,
} from '../../lib/healthStorage';
import { deriveGamificationState } from '../../lib/gamification';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type CareExpert = { id: string; name: string; email: string };

export function AppHome() {
  const { token } = usePatientAuth();
  const [careExperts, setCareExperts] = useState<CareExpert[]>([]);

  useEffect(() => {
    if (!token) {
      setCareExperts([]);
      return;
    }
    apiFetch<{ experts: CareExpert[] }>('/api/me/care-team', { token })
      .then((r) => setCareExperts(r.experts || []))
      .catch(() => setCareExperts([]));
  }, [token]);

  const bmiList = loadBmiEntries().sort((a, b) => b.date.localeCompare(a.date));
  const moodList = loadMoodEntries().sort((a, b) => b.date.localeCompare(a.date));
  const chat = loadAiChat();
  const latestBmi = bmiList[0];
  const latestMood = moodList[0];
  const gam = deriveGamificationState();

  const cards = [
    {
      to: ROUTES.app.bmi,
      title: 'Chỉ số BMI',
      desc: latestBmi
        ? `Mới nhất: ${latestBmi.bmi} (${bmiCategory(latestBmi.bmi)}) — ${latestBmi.date}`
        : 'Chưa có dữ liệu. Thêm lần đo đầu tiên.',
      icon: Scale,
    },
    {
      to: ROUTES.app.mood,
      title: 'Nhật ký cảm xúc',
      desc: latestMood
        ? `Hôm ${latestMood.date}: ${latestMood.moodLabel}${
            latestMood.note
              ? ` — ${latestMood.note.length > 48 ? `${latestMood.note.slice(0, 48)}…` : latestMood.note}`
              : ''
          }`
        : 'Ghi lại cảm xúc hôm nay trong vài giây.',
      icon: Heart,
    },
    {
      to: ROUTES.app.chat,
      title: 'Tezca AI',
      desc:
        chat.length > 0
          ? `${chat.length} tin nhắn đã lưu trên máy. Đăng nhập để dùng ChatGPT khi server bật.`
          : 'Gợi ý sức khỏe: demo cục bộ khi chưa đăng nhập; ChatGPT khi đã đăng nhập + API.',
      icon: MessageCircle,
    },
    {
      to: ROUTES.app.plans,
      title: 'Kế hoạch dinh dưỡng & tập',
      desc: 'Sinh bản kế hoạch mẫu từ mục tiêu và mức vận động của bạn.',
      icon: ClipboardList,
    },
    {
      to: ROUTES.app.rewards,
      title: 'Phần thưởng & động lực',
      desc: `Cấp ${gam.level} · ${gam.xp} XP · ${gam.unlockedCount}/${gam.badges.length} huy hiệu · Chuỗi ${gam.stats.moodStreak} ngày`,
      icon: Trophy,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A202C' }}>
          Xin chào
        </h1>
        <p className="mt-2 opacity-70" style={{ color: '#1A202C' }}>
          Theo dõi thể chất và tinh thần tại một nơi. Khi đăng nhập, dữ liệu đồng bộ lên server để chuyên gia được gán
          đồng hành (chat trực tiếp không thay cho khám trực tiếp).
        </p>
      </div>

      {token && (
        <div
          className="rounded-2xl border p-4 flex gap-3 items-start"
          style={{
            borderColor: careExperts.length ? 'rgba(45, 212, 191, 0.35)' : 'rgba(251, 191, 36, 0.45)',
            backgroundColor: careExperts.length ? 'rgba(45, 212, 191, 0.08)' : 'rgba(251, 191, 36, 0.08)',
          }}
        >
          <Stethoscope size={22} className="shrink-0 mt-0.5" style={{ color: careExperts.length ? '#0F766E' : '#B45309' }} />
          <div className="min-w-0 text-sm" style={{ color: '#1A202C' }}>
            {careExperts.length > 0 ? (
              <>
                <p className="font-semibold m-0 mb-1">Chuyên gia đồng hành</p>
                <ul className="m-0 pl-4 list-disc opacity-90">
                  {careExperts.map((e) => (
                    <li key={e.id}>
                      {e.name} <span className="opacity-60">({e.email})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 opacity-75 m-0 text-xs">
                  Mở <Link to={ROUTES.app.expertChat} style={{ color: '#0F766E', fontWeight: 600 }}>Chat chuyên gia</Link> để trao đổi
                  thời gian thực.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold m-0 mb-1">Chưa có chuyên gia được gán</p>
                <p className="opacity-85 m-0 text-xs leading-relaxed">
                  Gửi email đăng ký Tezca cho chuyên gia của bạn — họ đăng nhập dashboard chuyên gia và thêm bạn bằng email
                  trong mục <strong>Bệnh nhân được gán</strong>. Sau đó bạn dùng Chat chuyên gia.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ to, title, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl p-6 border transition-all hover:shadow-lg"
            style={{
              backgroundColor: 'white',
              borderColor: 'rgba(26, 32, 44, 0.08)',
              boxShadow: '0 8px 40px -20px rgba(26, 32, 44, 0.12)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)' }}
              >
                <Icon size={22} style={{ color: '#0D9488' }} />
              </div>
              <ArrowRight
                size={20}
                className="opacity-30 group-hover:opacity-100 transition-opacity shrink-0"
                style={{ color: '#1A202C' }}
              />
            </div>
            <h2 className="mt-4 text-lg font-semibold" style={{ color: '#1A202C' }}>
              {title}
            </h2>
            <p className="mt-2 text-sm opacity-70 leading-relaxed" style={{ color: '#1A202C' }}>
              {desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
