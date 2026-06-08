/**
 * Gửi email đặt lại mật khẩu qua Resend (fetch, không thêm dependency).
 * Dev / không cấu hình: in link ra console.
 */

export function shouldExposeResetLink() {
  return (
    process.env.NODE_ENV !== 'production' || process.env.TEZCA_EXPOSE_RESET_LINK === '1'
  );
}

export function buildAppOrigin(req) {
  const fromEnv = process.env.TEZCA_APP_URL || process.env.APP_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  const origin = req?.headers?.origin;
  if (typeof origin === 'string' && origin.startsWith('http')) {
    return origin.replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

export function buildPasswordResetUrl(req, token) {
  const base = buildAppOrigin(req);
  return `${base}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail({ to, resetUrl, name }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TEZCA_MAIL_FROM || 'Tezca <onboarding@resend.dev>';
  const subject = 'Đặt lại mật khẩu Tezca';
  const greeting = name ? `Xin chào ${name},` : 'Xin chào,';
  const html = `
    <p>${greeting}</p>
    <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu tài khoản Tezca.</p>
    <p><a href="${resetUrl}">Nhấn vào đây để đặt mật khẩu mới</a> — liên kết hết hạn sau 1 giờ.</p>
    <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  `.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[tezca] Liên kết đặt lại mật khẩu cho ${to}:\n  ${resetUrl}`);
    } else {
      console.warn(`[tezca] RESEND_API_KEY chưa cấu hình — không gửi email tới ${to}`);
    }
    return { sent: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    console.error('[tezca] Resend lỗi:', err);
    throw new Error('Không gửi được email. Thử lại sau.');
  }

  return { sent: true };
}
