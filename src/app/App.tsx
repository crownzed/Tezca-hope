import { Routes, Route, Navigate } from 'react-router';
import { MarketingLayout } from './layouts/MarketingLayout';
import { LandingPage } from './pages/LandingPage';
import { MarketingNotFoundPage } from './pages/MarketingNotFoundPage';
import { ROUTES } from './routes';
import { ProductFeaturesPage } from './pages/marketing/ProductFeaturesPage';
import { ProductSecurityPage } from './pages/marketing/ProductSecurityPage';
import { ProductExpertsPage } from './pages/marketing/ProductExpertsPage';
import { ProductPricingPage } from './pages/marketing/ProductPricingPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage';
import { CookiePolicyPage } from './pages/legal/CookiePolicyPage';
import { GdprNoticePage } from './pages/legal/GdprNoticePage';
import { UserAppLayout } from './layouts/UserAppLayout';
import { AppHome } from './pages/app/AppHome';
import { BmiPage } from './pages/app/BmiPage';
import { MoodJournalPage } from './pages/app/MoodJournalPage';
import { AiChatPage } from './pages/app/AiChatPage';
import { PlansPage } from './pages/app/PlansPage';
import { RewardsPage } from './pages/app/RewardsPage';
import { PatientExpertChatPage } from './pages/app/PatientExpertChatPage';
import { ExpertLayout } from './layouts/ExpertLayout';
import { LoginHubPage, PatientLoginPage, ExpertLoginPage } from './pages/DualLoginPage';
import { ExpertPatientListPage } from './pages/expert/ExpertPatientListPage';
import { ExpertPatientWorkspacePage } from './pages/expert/ExpertPatientWorkspacePage';
import { DoctorDashboardPage } from './pages/expert/DoctorDashboardPage';
import { ExpertSettingsPage } from './pages/expert/ExpertSettingsPage';

export default function App() {
  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: '#F9F9FB', color: '#1A202C' }}>
      <Routes>
        {/* Alias SEO / gõ nhanh → URL chuẩn tiếng Việt */}
        <Route path="/privacy" element={<Navigate to={ROUTES.legal.privacy} replace />} />
        <Route path="/terms" element={<Navigate to={ROUTES.legal.terms} replace />} />
        <Route path="/cookie-policy" element={<Navigate to={ROUTES.legal.cookie} replace />} />
        <Route path="/gdpr" element={<Navigate to={ROUTES.legal.gdpr} replace />} />
        <Route path="/features" element={<Navigate to={ROUTES.product.features} replace />} />
        <Route path="/pricing" element={<Navigate to={ROUTES.product.pricing} replace />} />
        <Route path="/security" element={<Navigate to={ROUTES.product.security} replace />} />
        <Route path="/experts" element={<Navigate to={ROUTES.product.experts} replace />} />
        <Route path="/san-pham/gia" element={<Navigate to={ROUTES.product.pricing} replace />} />

        <Route element={<MarketingLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/san-pham/tinh-nang" element={<ProductFeaturesPage />} />
          <Route path="/san-pham/bao-mat" element={<ProductSecurityPage />} />
          <Route path="/san-pham/chuyen-gia" element={<ProductExpertsPage />} />
          <Route path="/san-pham/bang-gia" element={<ProductPricingPage />} />
          <Route path="/phap-ly/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
          <Route path="/phap-ly/dieu-khoan" element={<TermsOfServicePage />} />
          <Route path="/phap-ly/cookie" element={<CookiePolicyPage />} />
          <Route path="/phap-ly/gdpr" element={<GdprNoticePage />} />
        </Route>
        <Route path={ROUTES.auth.hub} element={<LoginHubPage />} />
        <Route path={ROUTES.auth.patientLogin} element={<PatientLoginPage />} />
        <Route path={ROUTES.auth.expertLogin} element={<ExpertLoginPage />} />
        <Route path="/login" element={<Navigate to={ROUTES.auth.hub} replace />} />
        <Route path="/app/login" element={<Navigate to={ROUTES.app.login} replace />} />
        <Route path="/expert/login" element={<Navigate to={ROUTES.expert.login} replace />} />
        <Route path="/app" element={<UserAppLayout />}>
          <Route index element={<AppHome />} />
          <Route path="bmi" element={<BmiPage />} />
          <Route path="mood" element={<MoodJournalPage />} />
          <Route path="chat" element={<AiChatPage />} />
          <Route path="expert-chat" element={<PatientExpertChatPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="*" element={<Navigate to={ROUTES.app.root} replace />} />
        </Route>
        <Route path="/expert" element={<ExpertLayout />}>
          <Route index element={<ExpertPatientListPage />} />
          <Route path="doctor-desk" element={<DoctorDashboardPage />} />
          <Route path="doctor-desk/:patientId" element={<DoctorDashboardPage />} />
          <Route path="settings" element={<ExpertSettingsPage />} />
          <Route path="patients/:patientId" element={<ExpertPatientWorkspacePage />} />
          <Route path="*" element={<Navigate to={ROUTES.expert.root} replace />} />
        </Route>
        <Route path="/expert/dashboard" element={<Navigate to={ROUTES.expert.doctorDesk} replace />} />
        <Route path="*" element={<MarketingNotFoundPage />} />
      </Routes>
    </div>
  );
}
