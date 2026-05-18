import { motion } from 'motion/react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../routes';

const QUICK_TOPICS: { label: string; q: string }[] = [
  {
    label: 'Sức khỏe tinh thần',
    q: 'Mình muốn trò chuyện ngắn về stress và giấc ngủ — có gợi ý thư giãn không?',
  },
  {
    label: 'Dinh dưỡng hôm nay',
    q: 'Gợi ý ý tưởng bữa ăn lành mạnh cho một ngày bình thường (không chế độ đặc biệt)?',
  },
  {
    label: 'Động lực vận động',
    q: 'Mình khó duy trì đi bộ — có cách nhỏ để bắt đầu lại không?',
  },
];

export function FloatingChatBubble() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2, duration: 0.5 }}
      className="fixed bottom-8 right-8 z-50 max-[480px]:right-4 max-[480px]:bottom-6"
    >
      {isExpanded ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl shadow-2xl overflow-hidden max-[440px]:max-w-[calc(100vw-2rem)]"
          style={{
            width: '380px',
            backgroundColor: 'white',
            border: '1px solid rgba(26, 32, 44, 0.1)',
          }}
        >
          <div
            className="p-4 flex items-center justify-between backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/95 flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="text-teal-600" size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">Tezca AI</div>
                <div className="text-xs text-white/85 truncate">Trò chuyện trên ứng dụng</div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-xs text-white/90"
                aria-label="Đóng widget"
              >
                Ẩn
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Thu gọn cửa sổ chat"
              >
                <X size={20} style={{ color: 'white' }} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="text-sm" style={{ color: '#1A202C' }}>
              <p className="mb-2 font-medium m-0">Xin chào!</p>
              <p className="opacity-70 m-0 leading-relaxed">
                Tezca AI hỗ trợ gợi ý sức khỏe chung (không phải tư vấn y khoa). Chọn chủ đề hoặc mở chat đầy đủ.
              </p>
            </div>

            <div className="space-y-2">
              {QUICK_TOPICS.map((item) => (
                <Link
                  key={item.label}
                  to={`${ROUTES.app.chat}?q=${encodeURIComponent(item.q)}`}
                  className="w-full block p-3 rounded-2xl text-left no-underline transition-all hover:scale-[1.01] hover:shadow-md border"
                  style={{
                    backgroundColor: 'rgba(45, 212, 191, 0.07)',
                    borderColor: 'rgba(45, 212, 191, 0.2)',
                    color: '#1A202C',
                  }}
                  onClick={() => setIsExpanded(false)}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="block text-xs opacity-55 mt-1 leading-snug line-clamp-2">{item.q}</span>
                </Link>
              ))}
            </div>

            <Link
              to={ROUTES.app.chat}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-semibold text-center transition-all hover:opacity-95 active:scale-[0.99] no-underline text-[#1A202C]"
              style={{
                background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                boxShadow: '0 8px 24px -8px rgba(20, 184, 166, 0.55)',
              }}
              onClick={() => setIsExpanded(false)}
            >
              <Sparkles size={18} strokeWidth={2} style={{ color: 'white' }} />
              <span style={{ color: 'white' }}>Mở Tezca AI đầy đủ</span>
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.button
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center relative border border-white/30"
          style={{
            background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
          }}
          aria-label="Mở Tezca AI"
        >
          <MessageCircle size={28} style={{ color: 'white' }} strokeWidth={2} />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#1A202C] text-teal-300 shadow">
            AI
          </span>
        </motion.button>
      )}

      {!isExpanded && (
        <motion.div
          className="absolute inset-0 rounded-full -z-10 blur-2xl pointer-events-none"
          style={{ backgroundColor: '#2DD4BF' }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.28, 0.1, 0.28],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}
