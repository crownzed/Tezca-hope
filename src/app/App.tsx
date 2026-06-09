import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router';
import { lazy, Suspense } from 'react';
import { MarketingLayout } from './layouts/MarketingLayout';
import { LandingPage } from './pages/LandingPage';
import { MarketingNotFoundPage } from './pages/MarketingNotFoundPage';
import { ROUTES } from './routes';
import { UserAppLayout } from './layouts/UserAppLayout';
import { CustomerAppGate } from './layouts/CustomerAppGate';
import { OnboardingGate } from './layouts/OnboardingGate';
import { CommunityLayout } from './layouts/CommunityLayout';
import { CommunityGate } from './layouts/CommunityGate';
import { ExpertLayout } from './layouts/ExpertLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginHubPage, CustomerLoginPage, ExpertLoginPage } from './pages/DualLoginPage';
import {
  LegacyAppRedirect,
  LegacyExpertDoctorDeskCustomerRedirect,
  LegacyExpertPatientRedirect,
  LegacyExpertRedirect,
  LegacyAppCommunityRedirect,
  PrefixAliasRedirect,
} from './components/LegacyPathRedirect';
import { useRouteDocument } from './hooks/useRouteDocument';

// Lazy-loaded pages (code-split)
const ProductFeaturesPage = lazy(() => import('./pages/marketing/ProductFeaturesPage').then(m => ({ default: m.ProductFeaturesPage })));
const ProductSecurityPage = lazy(() => import('./pages/marketing/ProductSecurityPage').then(m => ({ default: m.ProductSecurityPage })));
const ProductExpertsPage = lazy(() => import('./pages/marketing/ProductExpertsPage').then(m => ({ default: m.ProductExpertsPage })));
const ProductPricingPage = lazy(() => import('./pages/marketing/ProductPricingPage').then(m => ({ default: m.ProductPricingPage })));
const LegalHubPage = lazy(() => import('./pages/legal/LegalHubPage').then(m => ({ default: m.LegalHubPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/legal/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const CommunityGuidelinesPage = lazy(() => import('./pages/legal/CommunityGuidelinesPage').then(m => ({ default: m.CommunityGuidelinesPage })));
const CookiePolicyPage = lazy(() => import('./pages/legal/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage })));
const GdprNoticePage = lazy(() => import('./pages/legal/GdprNoticePage').then(m => ({ default: m.GdprNoticePage })));
const AppHome = lazy(() => import('./pages/app/AppHome').then(m => ({ default: m.AppHome })));
const BmiPage = lazy(() => import('./pages/app/BmiPage').then(m => ({ default: m.BmiPage })));
const MoodJournalPage = lazy(() => import('./pages/app/MoodJournalPage').then(m => ({ default: m.MoodJournalPage })));
const AiChatPage = lazy(() => import('./pages/app/AiChatPage').then(m => ({ default: m.AiChatPage })));
const PlansPage = lazy(() => import('./pages/app/PlansPage').then(m => ({ default: m.PlansPage })));
const RewardsPage = lazy(() => import('./pages/app/RewardsPage').then(m => ({ default: m.RewardsPage })));
const CustomerExpertChatPage = lazy(() => import('./pages/app/CustomerExpertChatPage').then(m => ({ default: m.CustomerExpertChatPage })));
const ChooseExpertPage = lazy(() => import('./pages/app/ChooseExpertPage').then(m => ({ default: m.ChooseExpertPage })));
const CommunityForumPage = lazy(() => import('./pages/community/CommunityForumPage').then(m => ({ default: m.CommunityForumPage })));
const CommunityRoomsPage = lazy(() => import('./pages/community/CommunityRoomsPage').then(m => ({ default: m.CommunityRoomsPage })));
const CommunityAnnouncementsPage = lazy(() => import('./pages/community/CommunityAnnouncementsPage').then(m => ({ default: m.CommunityAnnouncementsPage })));
const CommunityDmPage = lazy(() => import('./pages/community/CommunityDmPage').then(m => ({ default: m.CommunityDmPage })));
const CommunitySavedPage = lazy(() => import('./pages/community/CommunitySavedPage').then(m => ({ default: m.CommunitySavedPage })));
const CommunityNotificationsPage = lazy(() => import('./pages/community/CommunityNotificationsPage').then(m => ({ default: m.CommunityNotificationsPage })));
const CommunitySearchPage = lazy(() => import('./pages/community/CommunitySearchPage').then(m => ({ default: m.CommunitySearchPage })));
const ExpertCustomerListPage = lazy(() => import('./pages/expert/ExpertCustomerListPage').then(m => ({ default: m.ExpertCustomerListPage })));
const ExpertCustomerWorkspacePage = lazy(() => import('./pages/expert/ExpertCustomerWorkspacePage').then(m => ({ default: m.ExpertCustomerWorkspacePage })));
const DoctorDashboardPage = lazy(() => import('./pages/expert/DoctorDashboardPage').then(m => ({ default: m.DoctorDashboardPage })));
const ExpertSettingsPage = lazy(() => import('./pages/expert/ExpertSettingsPage').then(m => ({ default: m.ExpertSettingsPage })));
const ExpertWeeklyReportPage = lazy(() => import('./pages/expert/ExpertWeeklyReportPage').then(m => ({ default: m.ExpertWeeklyReportPage })));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminExpertManagementPage = lazy(() => import('./pages/admin/AdminExpertManagementPage').then(m => ({ default: m.AdminExpertManagementPage })));
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage').then(m => ({ default: m.AdminCustomersPage })));
const ForgotPasswordPage = lazy(() => import('./pages/PasswordResetPages').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/PasswordResetPages').then(m => ({ default: m.ResetPasswordPage })));
const CustomerDashboardPage = lazy(() => import('./pages/app/CustomerDashboardPage').then(m => ({ default: m.CustomerDashboardPage })));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function CommunityIndexRedirect() {
  const { search } = useLocation();
  const tab = new URLSearchParams(search).get('tab');
  return (
    <Navigate
      to={tab === 'rooms' ? ROUTES.community.rooms : ROUTES.community.forum}
      replace
    />
  );
}

function AppRoutes() {
  useRouteDocument();

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/ung-dung/*" element={<PrefixAliasRedirect fromPrefix="/ung-dung" toPrefix="/app" />} />

      {/* Alias SEO / gõ nhanh → URL chuẩn */}
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
        <Route path="/phap-ly" element={<LegalHubPage />} />
        <Route path="/phap-ly/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
        <Route path="/phap-ly/dieu-khoan" element={<TermsOfServicePage />} />
        <Route path="/phap-ly/quy-tac-cong-dong" element={<CommunityGuidelinesPage />} />
        <Route path="/phap-ly/cookie" element={<CookiePolicyPage />} />
        <Route path="/phap-ly/gdpr" element={<GdprNoticePage />} />
      </Route>

      <Route path={ROUTES.auth.hub} element={<LoginHubPage />} />
      <Route path="/dang-nhap/benh-nhan" element={<Navigate to={ROUTES.auth.customerLogin} replace />} />
      <Route path={ROUTES.auth.customerLogin} element={<CustomerLoginPage />} />
      <Route path={ROUTES.auth.expertLogin} element={<ExpertLoginPage />} />
      <Route path={ROUTES.auth.adminLogin} element={<AdminLoginPage />} />
      <Route path={ROUTES.auth.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.auth.resetPassword} element={<ResetPasswordPage />} />
      <Route path="/login" element={<Navigate to={ROUTES.auth.hub} replace />} />
      <Route path="/app/login" element={<Navigate to={ROUTES.app.login} replace />} />
      <Route path="/expert/login" element={<Navigate to={ROUTES.expert.login} replace />} />

      {/* —— Cộng đồng (khu chức năng riêng) —— */}
      <Route path="/cong-dong" element={<CommunityLayout />}>
        <Route element={<CommunityGate />}>
          <Route index element={<CommunityIndexRedirect />} />
          <Route path="dien-dan" element={<CommunityForumPage />} />
          <Route path="phong-chat" element={<CommunityRoomsPage />} />
          <Route path="thong-bao" element={<CommunityAnnouncementsPage />} />
          <Route path="tin-nhan" element={<CommunityDmPage />} />
          <Route path="da-luu" element={<CommunitySavedPage />} />
          <Route path="thong-bao-cua-toi" element={<CommunityNotificationsPage />} />
          <Route path="tim-kiem" element={<CommunitySearchPage />} />
        </Route>
      </Route>

      {/* —— Ứng dụng khách hàng (phân cấp) —— */}
      <Route path="/app" element={<UserAppLayout />}>
        <Route element={<CustomerAppGate />}>
          <Route element={<OnboardingGate />}>
          <Route index element={<Navigate to={ROUTES.app.dashboard} replace />} />
          <Route path="trung-tam-ky-luat" element={<AppHome />} />

          <Route path="suc-khoe">
            <Route index element={<Navigate to="bmi" replace />} />
            <Route path="bmi" element={<BmiPage />} />
            <Route path="cam-xuc" element={<MoodJournalPage />} />
            <Route path="ho-so-benh-ly" element={<Navigate to={ROUTES.app.bmi} replace />} />
          </Route>

          <Route path="ho-tro">
            <Route index element={<Navigate to="tezca-ai" replace />} />
            <Route path="tezca-ai" element={<AiChatPage />} />
            <Route path="chat-chuyen-gia" element={<CustomerExpertChatPage />} />
            <Route path="chon-chuyen-gia" element={<ChooseExpertPage />} />
          </Route>

          <Route path="ke-hoach">
            <Route index element={<Navigate to="luyen-tap" replace />} />
            <Route path="luyen-tap" element={<PlansPage />} />
          </Route>

          <Route path="thanh-tuu">
            <Route index element={<Navigate to="phan-thuong" replace />} />
            <Route path="phan-thuong" element={<RewardsPage />} />
          </Route>

          <Route path="cong-dong" element={<LegacyAppCommunityRedirect />} />
          <Route path="cong-dong/dien-dan" element={<LegacyAppCommunityRedirect />} />
          <Route path="cong-dong/phong-chat" element={<LegacyAppCommunityRedirect />} />

          {/* Legacy — path phẳng */}
          <Route path="bmi" element={<LegacyAppRedirect />} />
          <Route path="mood" element={<LegacyAppRedirect />} />
          <Route path="chat" element={<LegacyAppRedirect />} />
          <Route path="expert-chat" element={<LegacyAppRedirect />} />
          <Route path="plans" element={<LegacyAppRedirect />} />
          <Route path="rewards" element={<LegacyAppRedirect />} />

          <Route path="*" element={<Navigate to={ROUTES.app.dashboard} replace />} />
          </Route>
        </Route>
      </Route>

      {/* —— Chuyên gia (phân cấp) —— */}
      <Route path="/expert" element={<ExpertLayout />}>
        <Route index element={<Navigate to={ROUTES.expert.customers.root} replace />} />

        <Route path="khach-hang">
          <Route index element={<ExpertCustomerListPage />} />
          <Route path=":customerId" element={<ExpertCustomerWorkspacePage />} />
        </Route>

        <Route path="ban-lam-viec">
          <Route index element={<DoctorDashboardPage />} />
          <Route path=":customerId" element={<DoctorDashboardPage />} />
        </Route>

        <Route path="bao-cao">
          <Route index element={<Navigate to="tuan" replace />} />
          <Route path="tuan" element={<ExpertWeeklyReportPage />} />
        </Route>

        <Route path="cai-dat" element={<ExpertSettingsPage />} />

        {/* Legacy */}
        <Route path="doctor-desk" element={<LegacyExpertRedirect />} />
        <Route path="doctor-desk/:customerId" element={<LegacyExpertDoctorDeskCustomerRedirect />} />
        <Route path="bao-cao-tuan" element={<LegacyExpertRedirect />} />
        <Route path="settings" element={<LegacyExpertRedirect />} />
        <Route path="patients/:customerId" element={<LegacyExpertPatientRedirect />} />

        <Route path="*" element={<Navigate to={ROUTES.expert.customers.root} replace />} />
      </Route>

      <Route path="/expert/dashboard" element={<Navigate to={ROUTES.expert.doctorDesk} replace />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to={ROUTES.admin.dashboard} replace />} />
        <Route path="quan-ly" element={<AdminDashboardPage />} />
        <Route path="chuyen-gia" element={<AdminExpertManagementPage />} />
        <Route path="khach-hang" element={<AdminCustomersPage />} />
      </Route>

      <Route path="*" element={<MarketingNotFoundPage />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: '#F9F9FB', color: '#1A202C' }}>
      <AppRoutes />
    </div>
  );
}
