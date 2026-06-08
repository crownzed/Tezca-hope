import { useRef, useState } from 'react';
import { Image, X } from 'lucide-react';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
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

/** Nén ảnh xuống tối đa maxDim px, trả về data URL (JPEG 0.78). */
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
        if (!ctx) { reject(new Error('canvas')); return; }
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    // reset input để chọn cùng file lại được
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImgError('Chỉ hỗ trợ file ảnh (JPG, PNG, GIF, WebP…)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImgError('Ảnh tối đa 10 MB');
      return;
    }
    setImgError('');
    setCompressing(true);
    try {
      const dataUrl = await compressImage(file);
      onImageUrlChange(dataUrl);
    } catch {
      setImgError('Không đọc được ảnh, hãy thử file khác.');
    } finally {
      setCompressing(false);
    }
  };

  const clearImage = () => {
    onImageUrlChange('');
    setImgError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasImage = Boolean(imageUrl.trim());

  return (
    <div className="rounded-2xl border p-4 shadow-sm space-y-3" style={tezcaCardStyle}>
      <div className="flex gap-3">
        <div
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          aria-hidden
        >
          {initials(authorName || 'B')}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
            placeholder="Chia sẻ kinh nghiệm, đặt câu hỏi hoặc động viên cộng đồng…"
            className="w-full rounded-xl border px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
            style={{ borderColor: tezcaTheme.border }}
          />

          {/* Ảnh xem trước */}
          {hasImage && (
            <div className="relative inline-block rounded-xl overflow-hidden border" style={{ borderColor: tezcaTheme.border }}>
              <img
                src={imageUrl}
                alt="Ảnh đính kèm"
                className="max-h-48 max-w-full object-cover"
                style={{ display: 'block' }}
              />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Xóa ảnh"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer"
                style={{ backgroundColor: 'rgba(15,23,42,0.65)', color: '#fff' }}
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          )}

          {compressing && (
            <p className="text-xs opacity-60 m-0">Đang xử lý ảnh…</p>
          )}
          {imgError && (
            <p className="text-xs text-red-600 m-0">{imgError}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-[52px]">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Chọn ảnh từ máy"
          onChange={(e) => void handleFileChange(e)}
        />

        {/* Nút chọn ảnh */}
        <button
          type="button"
          disabled={compressing}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border-0 cursor-pointer disabled:opacity-50"
          style={{
            backgroundColor: hasImage ? 'rgba(45,212,191,0.15)' : tezcaTheme.subtleBg,
            color: hasImage ? tezcaTheme.accentDark : tezcaTheme.text,
            opacity: compressing ? 0.5 : undefined,
          }}
        >
          <Image size={14} aria-hidden />
          {compressing ? 'Đang nén…' : hasImage ? 'Thay ảnh' : 'Thêm ảnh'}
        </button>

        {/* Chủ đề */}
        {POST_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTopicChange(t.id)}
            className="text-xs px-2.5 py-1 rounded-full border cursor-pointer"
            style={
              topic === t.id
                ? { background: tezcaTheme.accentGradient, borderColor: 'transparent', color: tezcaTheme.text }
                : { borderColor: tezcaTheme.border, color: tezcaTheme.textMuted }
            }
          >
            {t.label}
          </button>
        ))}

        <button
          type="button"
          disabled={busy || !content.trim()}
          onClick={onSubmit}
          className="ml-auto rounded-full px-4 py-1.5 text-xs font-semibold border-0 cursor-pointer disabled:opacity-50"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          {busy ? 'Đang đăng…' : 'Đăng bài'}
        </button>
      </div>
    </div>
  );
}
