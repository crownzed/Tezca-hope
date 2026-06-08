import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { NotFoundPage } from './NotFoundPage';

/** 404 với cùng khung marketing (Header/Footer), không dùng Outlet — tránh chặn /app, /expert */
export function MarketingNotFoundPage() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header variant="marketing" />
      <main className="min-h-[60vh]">
        <NotFoundPage />
      </main>
      <Footer />
    </>
  );
}
