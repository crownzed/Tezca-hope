import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string; alreadySubscribed?: boolean }>('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: trimmed, source: 'landing' }),
      });
      toast.success(res.alreadySubscribed ? 'Email này đã đăng ký — cảm ơn bạn!' : res.message);
      setEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không đăng ký được. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mx-auto max-w-xl flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
      <label htmlFor="newsletter-email" className="sr-only">
        Email nhận tin Tezca
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        placeholder="you@email.com"
        className="flex-1 rounded-full px-5 py-3.5 text-sm outline-none transition-shadow focus:ring-4 disabled:opacity-60"
        style={{
          border: '1px solid rgba(26, 32, 44, 0.12)',
          backgroundColor: 'white',
          color: '#1A202C',
        }}
      />
      <motion.button
        type="submit"
        disabled={busy}
        className="rounded-full px-8 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
        }}
        whileHover={reduce || busy ? undefined : { scale: 1.03, boxShadow: '0 12px 32px -8px rgba(45, 212, 191, 0.55)' }}
        whileTap={reduce || busy ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      >
        {busy ? 'Đang gửi…' : 'Nhận tin tức'}
      </motion.button>
    </form>
  );
}
