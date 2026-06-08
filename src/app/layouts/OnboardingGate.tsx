import { useState, useCallback } from 'react';
import { Outlet } from 'react-router';
import { useCustomerSession } from '../lib/customerSessionGate';
import { OnboardingWizard, type OnboardingData } from '../components/OnboardingWizard';
import { loadBmiEntries, saveBmiEntries } from '../lib/healthStorage';
import { useNavigate } from 'react-router';
import { ROUTES } from '../routes';

const ONBOARDING_KEY = 'tezca_onboarding_done';

function isOnboardingDone(userId: string | null): boolean {
  if (!userId) return true; // Guest không cần onboarding
  return localStorage.getItem(`${ONBOARDING_KEY}_${userId}`) === '1';
}

function markOnboardingDone(userId: string | null) {
  if (userId) {
    localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, '1');
  }
}

/**
 * Wrap app routes — hiện Onboarding wizard cho user mới đăng ký.
 * Nếu đã hoàn thành onboarding hoặc là guest → render Outlet bình thường.
 */
export function OnboardingGate() {
  const { user, isAuthenticated } = useCustomerSession();
  const userId = user?.id || null;
  const navigate = useNavigate();

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!isAuthenticated || !userId) return false;
    return !isOnboardingDone(userId);
  });

  const handleComplete = useCallback((data: OnboardingData) => {
    // Lưu BMI data
    if (data.weightKg && data.heightCm) {
      const w = parseFloat(data.weightKg);
      const h = parseFloat(data.heightCm);
      if (w > 0 && h > 0) {
        const entries = loadBmiEntries();
        entries.push({ weightKg: w, heightCm: h, date: new Date().toISOString().slice(0, 10) });
        saveBmiEntries(entries);
      }
    }

    // Lưu goal + preferences vào localStorage (để PlansPage đọc)
    if (userId) {
      localStorage.setItem(`tezca_onboarding_prefs_${userId}`, JSON.stringify({
        goal: data.goal,
        sessionsPerWeek: data.sessionsPerWeek,
        equipment: data.equipment,
      }));
    }

    markOnboardingDone(userId);
    setShowOnboarding(false);

    // Redirect tới trang Kế hoạch để sinh plan AI ngay
    navigate(ROUTES.app.plans);
  }, [userId, navigate]);

  const handleSkip = useCallback(() => {
    markOnboardingDone(userId);
    setShowOnboarding(false);
  }, [userId]);

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleComplete} onSkip={handleSkip} />;
  }

  return <Outlet />;
}
