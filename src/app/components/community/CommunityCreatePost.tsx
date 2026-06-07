import { useRef, useState } from 'react';
import { Hash, Image, Link2, X } from 'lucide-react';
import { communityShell } from '../../lib/communityShellTheme';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { POST_TOPICS, type CommunityPostTopic } from '../../lib/communityTopics';

type CommunityCreatePostProps = {
  authorName: string;
  topic: CommunityPostTopic;
  content: string;
  imageUrl: string;
  busy: boolean;
  onTopicChange: (topic: CommunityPostTopic) => void;
  onContentChange: (content: string) => void;
  onImageUrlChange: (url: string) => void;
  onSubmit: () => void;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function compressImage(file: File, maxDim = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function CommunityCreatePost({
  authorName,
  topic,
  content,
  imageUrl,
  busy,
  onTopicChange,
  onContentChange,
  onImageUrlChange,
  onSubmit,
}: CommunityCreatePostProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [imgError, setImgError] = useState('');
  const [showTopics, setShowTopics] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImgError('Chỉ hỗ trợ file ảnh');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImgError('Ảnh tối đa 10 MB');
      return;
    }
    setImgError('');
    setCompressing(true);
    try {
      onImageUrlChange(await compressImage(file));
    } catch {
      setImgError('Không đọc được ảnh');
    } finally {
      setCompressing(false);
    }
  };

  const hasImage = Boolean(imageUrl.trim());

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: communityShell.cardBg,
        borderColor: communityShell.cardBorder,
        boxShadow: communityShell.cardShadow,
      }}
    >
      <div className="flex gap-3">
        <div
          className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          aria-hidden
        >
          {initials(authorName || 'B')}
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
            placeholder="Chia sẻ kinh nghiệm hoặc đặt câu hỏi…"
            className="w-full rounded-xl border-0 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 min-h-[52px]"
            style={{
              backgroundColor: communityShell.inputBg,
              color: tezcaTheme.text,
            }}
          />
        </div>
      </div>

      {hasImage && (
        <div className="relative mt-3 ml-14 rounded-xl overflow-hidden border max-w-md" style={{ borderColor: communityShell.cardBorder }}>
          <img src={imageUrl} alt="" className="max-h-52 w-full object-cover" />
          <button
            type="button"
            onClick={() => onImageUrlChange('')}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer text-white"
            style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}
            aria-label="Xóa ảnh"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {compressing && <p className="text-xs opacity-60 m-0 mt-2 ml-14">Đang xử lý ảnh…</p>}
      {imgError && <p className="text-xs text-red-600 m-0 mt-2 ml-14">{imgError}</p>}

      <div className="flex flex-wrap items-center gap-1 mt-3 ml-14 pt-3 border-t" style={{ borderColor: communityShell.cardBorder }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void handleFileChange(e)}
        />
        <button
          type="button"
          disabled={compressing}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border-0 cursor-pointer hover:opacity-80"
          style={{ color: communityShell.navText, backgroundColor: 'transparent' }}
        >
          <Image size={16} aria-hidden />
          Ảnh
        </button>
        <button
          type="button"
          onClick={() => setShowTopics((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border-0 cursor-pointer hover:opacity-80"
          style={{ color: communityShell.navText, backgroundColor: 'transparent' }}
        >
          <Hash size={16} aria-hidden />
          Chủ đề
        </button>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium opacity-40"
          style={{ color: communityShell.navText }}
          title="Sắp có"
        >
          <Link2 size={16} aria-hidden />
          Liên kết
        </span>

        <button
          type="button"
          disabled={busy || !content.trim()}
          onClick={onSubmit}
          className="ml-auto rounded-full px-5 py-2 text-xs font-semibold border-0 cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: communityShell.navActiveBg, color: communityShell.navActiveText }}
        >
          {busy ? 'Đang đăng…' : 'Đăng'}
        </button>
      </div>

      {showTopics && (
        <div className="flex flex-wrap gap-2 mt-3 ml-14">
          {POST_TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onTopicChange(t.id);
                setShowTopics(false);
              }}
              className="text-xs px-3 py-1.5 rounded-full border cursor-pointer"
              style={
                topic === t.id
                  ? { backgroundColor: communityShell.navActiveBg, borderColor: 'transparent' }
                  : { borderColor: communityShell.cardBorder, color: communityShell.navText }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
