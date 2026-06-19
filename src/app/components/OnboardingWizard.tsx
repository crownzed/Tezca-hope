import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Scale, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export type OnboardingData = {
  goal: 'lose' | 'maintain' | 'gain';
  weightKg: string;
  heightCm: string;
  sessionsPerWeek: string;
  equipment: 'gym' | 'home' | 'both';
};

type Props = {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
};

const GOALS = [
  { value: 'lose' as const, label: 'Giảm cân', emoji: '🔥', desc: 'Giảm mỡ, giữ cơ' },
  { value: 'maintain' as const, label: 'Duy trì', emoji: '⚖️', desc: 'Giữ vóc dáng hiện tại' },
  { value: 'gain' as const, label: 'Tăng cân', emoji: '💪', desc: 'Tăng cơ, tăng khối lượng' },
];

export function OnboardingWizard({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    goal: 'maintain',
    weightKg: '',
    heightCm: '',
    sessionsPerWeek: '3',
    equipment: 'both',
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const finish = () => {
    onComplete(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.05), rgba(20, 184, 166, 0.02))' }}>
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: i <= step ? '#2DD4BF' : 'rgba(26, 32, 44, 0.1)' }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)' }}>
                  <Target size={32} style={{ color: '#2DD4BF' }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: '#1A202C' }}>Mục tiêu của bạn là gì?</h2>
                <p className="text-sm" style={{ color: 'rgba(26, 32, 44, 0.6)' }}>Chọn mục tiêu chính để AI tạo kế hoạch phù hợp</p>
              </div>

              <div className="space-y-3">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setData((d) => ({ ...d, goal: g.value }))}
                    className="w-full p-4 rounded-2xl text-left flex items-center gap-4 transition-all"
                    style={{
                      border: data.goal === g.value ? '2px solid #2DD4BF' : '2px solid rgba(26, 32, 44, 0.08)',
                      backgroundColor: data.goal === g.value ? 'rgba(45, 212, 191, 0.05)' : 'white',
                    }}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <div className="font-semibold" style={{ color: '#1A202C' }}>{g.label}</div>
                      <div className="text-sm" style={{ color: 'rgba(26, 32, 44, 0.6)' }}>{g.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={next}
                className="w-full py-4 rounded-full font-semibold text-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: '#2DD4BF', color: '#1A202C' }}
              >
                Tiếp tục <ArrowRight size={20} />
              </button>
              <button
                onClick={onSkip}
                className="w-full py-3 text-sm font-medium text-center"
                style={{ color: 'rgba(26, 32, 44, 0.5)' }}
              >
                Bỏ qua, tôi tự khám phá
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)' }}>
                  <Scale size={32} style={{ color: '#2DD4BF' }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: '#1A202C' }}>Chỉ số cơ thể</h2>
                <p className="text-sm" style={{ color: 'rgba(26, 32, 44, 0.6)' }}>Giúp AI tính toán lượng calo và bài tập phù hợp</p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium" style={{ color: '#1A202C' }}>Cân nặng (kg)</span>
                  <input
                    type="number"
                    min={30}
                    max={200}
                    value={data.weightKg}
                    onChange={(e) => setData((d) => ({ ...d, weightKg: e.target.value }))}
                    className="mt-1 w-full rounded-xl px-4 py-3 border text-lg"
                    style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
                    placeholder="Ví dụ: 65"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium" style={{ color: '#1A202C' }}>Chiều cao (cm)</span>
                  <input
                    type="number"
                    min={100}
                    max={250}
                    value={data.heightCm}
                    onChange={(e) => setData((d) => ({ ...d, heightCm: e.target.value }))}
                    className="mt-1 w-full rounded-xl px-4 py-3 border text-lg"
                    style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
                    placeholder="Ví dụ: 170"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={back}
                  className="px-6 py-4 rounded-full font-medium flex items-center gap-2"
                  style={{ color: 'rgba(26, 32, 44, 0.7)', border: '2px solid rgba(26, 32, 44, 0.1)' }}
                >
                  <ArrowLeft size={18} /> Quay lại
                </button>
                <button
                  onClick={next}
                  className="flex-1 py-4 rounded-full font-semibold text-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#2DD4BF', color: '#1A202C' }}
                >
                  Tiếp tục <ArrowRight size={20} />
                </button>
              </div>
              <button
                onClick={onSkip}
                className="w-full py-3 text-sm font-medium text-center"
                style={{ color: 'rgba(26, 32, 44, 0.5)' }}
              >
                Bỏ qua
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)' }}>
                  <Sparkles size={32} style={{ color: '#2DD4BF' }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: '#1A202C' }}>Sở thích tập luyện</h2>
                <p className="text-sm" style={{ color: 'rgba(26, 32, 44, 0.6)' }}>AI sẽ tạo kế hoạch dựa trên điều kiện của bạn</p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium" style={{ color: '#1A202C' }}>Số buổi tập mong muốn/tuần</span>
                  <select
                    value={data.sessionsPerWeek}
                    onChange={(e) => setData((d) => ({ ...d, sessionsPerWeek: e.target.value }))}
                    className="mt-1 w-full rounded-xl px-4 py-3 border text-lg"
                    style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
                  >
                    <option value="2">2 buổi/tuần</option>
                    <option value="3">3 buổi/tuần</option>
                    <option value="4">4 buổi/tuần</option>
                    <option value="5">5 buổi/tuần</option>
                    <option value="6">6 buổi/tuần</option>
                  </select>
                </label>

                <div>
                  <span className="text-sm font-medium block mb-2" style={{ color: '#1A202C' }}>Thiết bị có sẵn</span>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'gym' as const, label: 'Phòng gym', emoji: '🏋️' },
                      { value: 'home' as const, label: 'Tại nhà', emoji: '🏠' },
                      { value: 'both' as const, label: 'Cả hai', emoji: '✨' },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setData((d) => ({ ...d, equipment: opt.value }))}
                        className="p-3 rounded-xl text-center transition-all"
                        style={{
                          border: data.equipment === opt.value ? '2px solid #2DD4BF' : '2px solid rgba(26, 32, 44, 0.08)',
                          backgroundColor: data.equipment === opt.value ? 'rgba(45, 212, 191, 0.05)' : 'white',
                        }}
                      >
                        <div className="text-xl mb-1">{opt.emoji}</div>
                        <div className="text-xs font-medium" style={{ color: '#1A202C' }}>{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={back}
                  className="px-6 py-4 rounded-full font-medium flex items-center gap-2"
                  style={{ color: 'rgba(26, 32, 44, 0.7)', border: '2px solid rgba(26, 32, 44, 0.1)' }}
                >
                  <ArrowLeft size={18} /> Quay lại
                </button>
                <button
                  onClick={finish}
                  className="flex-1 py-4 rounded-full font-semibold text-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#2DD4BF', color: '#1A202C' }}
                >
                  <Sparkles size={20} /> Tạo kế hoạch cho tôi
                </button>
              </div>
              <button
                onClick={onSkip}
                className="w-full py-3 text-sm font-medium text-center"
                style={{ color: 'rgba(26, 32, 44, 0.5)' }}
              >
                Bỏ qua, tôi tự khám phá
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
