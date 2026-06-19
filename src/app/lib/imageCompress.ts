/**
 * imageCompress.ts — Nén ảnh phía client thành data URL (JPEG) để gửi kèm
 * bài cộng đồng và tin nhắn chat. Dùng chung để tránh trùng lặp.
 */

/** Nén ảnh xuống tối đa maxDim px, trả về data URL (JPEG, chất lượng cho trước). */
export function compressImage(file: File, maxDim = 1200, quality = 0.78): Promise<string> {
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
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export type ImagePickResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

/**
 * Validate + nén một file ảnh người dùng chọn.
 * @param maxBytes giới hạn kích thước file gốc (mặc định 10 MB)
 */
export async function pickAndCompressImage(
  file: File,
  maxDim = 1200,
  maxBytes = 10 * 1024 * 1024,
): Promise<ImagePickResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Chỉ hỗ trợ file ảnh (JPG, PNG, GIF, WebP…)' };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: 'Ảnh tối đa 10 MB' };
  }
  try {
    const dataUrl = await compressImage(file, maxDim);
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: 'Không đọc được ảnh, hãy thử file khác.' };
  }
}
