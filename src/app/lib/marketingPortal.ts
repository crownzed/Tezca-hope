import { useMemo } from 'react';
import { ROUTES } from '../routes';
import { useAnyCommunitySession, type CommunityRole } from './useCommunitySession';

export type MarketingPortal = {
  ready: boolean;
  role: CommunityRole;
  isAuthenticated: boolean;
  href: string | null;
  label: string;
};

function resolveMarketingPortal(
  ready: boolean,
  isAuthenticated: boolean,
  role: CommunityRole,
): MarketingPortal {
  if (!ready) {
    return { ready: false, role, isAuthenticated: false, href: null, label: '' };
  }
  if (!isAuthenticated) {
    return { ready: true, role, isAuthenticated: false, href: null, label: '' };
  }
  switch (role) {
    case 'admin':
      return {
        ready: true,
        role,
        isAuthenticated: true,
        href: ROUTES.admin.dashboard,
        label: 'Bảng quản trị',
      };
    case 'expert':
      return {
        ready: true,
        role,
        isAuthenticated: true,
        href: ROUTES.expert.customers.root,
        label: 'Bàn làm việc',
      };
    case 'customer':
      return {
        ready: true,
        role,
        isAuthenticated: true,
        href: ROUTES.app.dashboard,
        label: 'Trung tâm Kỷ luật',
      };
    default:
      return { ready: true, role, isAuthenticated: false, href: null, label: '' };
  }
}

export function useMarketingPortal(): MarketingPortal {
  const { isAuthenticated, isVerifying, role } = useAnyCommunitySession();
  return useMemo(
    () => resolveMarketingPortal(!isVerifying, isAuthenticated, role),
    [isAuthenticated, isVerifying, role],
  );
}
