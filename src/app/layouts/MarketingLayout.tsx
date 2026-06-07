import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { SessionLoading } from '../components/tezca/SessionLoading';
import { useMarketingPortal } from '../lib/marketingPortal';

export function MarketingLayout() {
  const { pathname, hash } = useLocation();
  const portal = useMarketingPortal();
  useEffect(() => {
    if (hash) {
      const id = hash.replace(/^#/, '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  if (!portal.ready) {
    return (
      <>
        <Header variant="marketing" />
        <SessionLoading title="Đang kiểm tra phiên…" minHeight="50vh" hint="" />
        <Footer />
      </>
    );
  }

  if (portal.role === 'admin' && portal.href) {
    return <Navigate to={portal.href} replace />;
  }

  return (
    <>
      <Header variant="marketing" />
      <main className="min-h-[60vh]">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
