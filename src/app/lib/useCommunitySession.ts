/**
 * Hook hợp nhất phiên cộng đồng — trả về token/user của bất kỳ tác nhân nào đang đăng nhập.
 * Ưu tiên: khách hàng → chuyên gia → quản trị viên.
 */
import { useMemo } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import type { AuthUser } from './useAuthSession';

export type CommunityRole = 'customer' | 'expert' | 'admin' | 'anonymous';

export type CommunitySesion = {
  token: string | null;
  user: AuthUser | null;
  role: CommunityRole;
  isAuthenticated: boolean;
  isVerifying: boolean;
  logout: () => void;
};

export function useAnyCommunitySession(): CommunitySesion {
  const customer = useCustomerAuth();
  const expert = useExpertAuth();
  const admin = useAdminAuth();

  return useMemo(() => {
    // Xác định phiên đang hoạt động
    const customerReady = customer.sessionReady;
    const expertReady = expert.sessionReady;
    const adminReady = admin.sessionReady;

    if (customer.token && customer.user) {
      return {
        token: customer.token,
        user: customer.user,
        role: 'customer' as CommunityRole,
        isAuthenticated: true,
        isVerifying: !customerReady,
        logout: customer.logout,
      };
    }
    if (expert.token && expert.user) {
      return {
        token: expert.token,
        user: expert.user,
        role: 'expert' as CommunityRole,
        isAuthenticated: true,
        isVerifying: !expertReady,
        logout: expert.logout,
      };
    }
    if (admin.token && admin.user) {
      return {
        token: admin.token,
        user: admin.user,
        role: 'admin' as CommunityRole,
        isAuthenticated: true,
        isVerifying: !adminReady,
        logout: admin.logout,
      };
    }
    // Đang xác minh (có token nhưng chưa verify xong)
    const verifying =
      (!!customer.token && !customerReady) ||
      (!!expert.token && !expertReady) ||
      (!!admin.token && !adminReady);
    return {
      token: null,
      user: null,
      role: 'anonymous' as CommunityRole,
      isAuthenticated: false,
      isVerifying: verifying,
      logout: () => {},
    };
  }, [customer, expert, admin]);
}
