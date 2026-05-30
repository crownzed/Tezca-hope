import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { getRouteMeta } from '../lib/routeMeta';

/** Cập nhật document.title theo route meta */
export function useRouteDocument() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = getRouteMeta(pathname);
    document.title = meta?.title ?? 'Tezca';
  }, [pathname]);
}
