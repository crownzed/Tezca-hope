/**
 * Image upload endpoint — upload lên Cloudinary.
 *
 * Env:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 *
 * Endpoint: POST /api/upload/image
 * Body: multipart/form-data với field "image"
 * Response: { url, publicId }
 */

import { Router } from 'express';
import { authMiddlewareRoles } from '../auth.js';
import { createRateLimiter } from '../rateLimit.js';

export const uploadRouter = Router();

const requireAuth = authMiddlewareRoles(['user', 'expert', 'admin']);

const uploadLimiter = createRateLimiter({
  name: 'upload',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT) || 20,
  message: 'Quá nhiều lần upload trong 1 giờ. Vui lòng đợi.',
});

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Upload ảnh lên Cloudinary qua unsigned upload (hoặc signed) */
uploadRouter.post('/image', requireAuth, uploadLimiter, async (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({ error: 'Upload chưa được cấu hình (Cloudinary)' });
    return;
  }

  // Parse raw body (expect base64 JSON hoặc multipart)
  const { image, folder } = req.body || {};

  if (!image) {
    res.status(400).json({ error: 'Thiếu trường image (base64 data URL)' });
    return;
  }

  // Validate data URL format
  const match = String(image).match(/^data:(image\/\w+);base64,/);
  if (!match) {
    res.status(400).json({ error: 'image phải là data URL base64 (data:image/...;base64,...)' });
    return;
  }

  const mimeType = match[1];
  if (!ALLOWED_TYPES.includes(mimeType)) {
    res.status(400).json({ error: `Loại ảnh không hỗ trợ. Cho phép: ${ALLOWED_TYPES.join(', ')}` });
    return;
  }

  // Check size (base64 ~ 4/3 original)
  const base64Data = image.slice(match[0].length);
  const sizeBytes = Math.ceil(base64Data.length * 3 / 4);
  if (sizeBytes > MAX_SIZE) {
    res.status(400).json({ error: `Ảnh quá lớn. Tối đa ${MAX_SIZE / 1024 / 1024}MB` });
    return;
  }

  try {
    // Cloudinary upload API (signed)
    const timestamp = Math.floor(Date.now() / 1000);
    const uploadFolder = folder ? String(folder).slice(0, 50) : 'tezca-uploads';

    // Generate signature
    const crypto = await import('crypto');
    const sigString = `folder=${uploadFolder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(sigString).digest('hex');

    const formData = new URLSearchParams();
    formData.append('file', image);
    formData.append('folder', uploadFolder);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      },
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      console.error('[upload] Cloudinary error:', uploadRes.status, errText);
      res.status(502).json({ error: 'Upload thất bại' });
      return;
    }

    const result = await uploadRes.json();
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('[upload] Error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Lỗi upload ảnh' });
  }
});
