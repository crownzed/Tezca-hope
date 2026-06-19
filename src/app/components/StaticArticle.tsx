import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../routes';

type Props = {
  title: string;
  updated?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function StaticArticle({ title, updated, children, footer }: Props) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      <p className="text-sm opacity-50 mb-4 m-0 flex flex-wrap gap-x-3 gap-y-1">
        <Link to={ROUTES.home} className="hover:opacity-100 transition-opacity" style={{ color: '#0F766E' }}>
          ← Trang chủ
        </Link>
        <span className="opacity-30">·</span>
        <Link to={ROUTES.legal.root} className="hover:opacity-100 transition-opacity" style={{ color: '#0F766E' }}>
          Pháp lý
        </Link>
      </p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ color: '#1A202C' }}>
        {title}
      </h1>
      {updated && (
        <p className="text-sm opacity-50 mb-10 m-0" style={{ color: '#1A202C' }}>
          Cập nhật: {updated}
        </p>
      )}
      <div
        className="space-y-4 text-[15px] md:text-base leading-relaxed opacity-90 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[#1A202C] [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:underline [&_a]:decoration-teal-600/50 [&_table]:w-full [&_code]:text-sm [&_code]:bg-black/5 [&_code]:px-1 [&_code]:rounded"
        style={{ color: '#1A202C' }}
      >
        {children}
        {footer}
      </div>
    </article>
  );
}
