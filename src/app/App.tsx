import { Routes, Route, Navigate, useLocation } from 'react-router';
import { MarketingLayout } from './layouts/MarketingLayout';
import { LandingPage } from './pages/LandingPage';
import { MarketingNotFoundPage } from './pages/MarketingNotFoundPage';
import { ROUTES } from './routes';
import { ProductFeaturesPage } from './pages/marketing/ProductFeaturesPage';
import { ProductSecurityPage } from './pages/marketing/ProductSecurityPage';
import { ProductExpertsPage } from './pages/marketing/ProductExpertsPage';
import { ProductPricingPage } from './pages/marketing/ProductPricingPage';
import { LegalHubPage } from './pages/legal/LegalHubPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage';
import { CommunityGuidelinesPage } from './pages/legal/CommunityGuidelinesPage';
import { CookiePolicyPage } from './pages/legal/CookiePolicyPage';
import { GdprNoticePage } from './pages/legal/GdprNoticePage';
import { UserAppLayout } from './layouts/UserAppLayout';
import { CustomerAppGate } from './layouts/CustomerAppGate';
import { AppHome } from './pages/app/AppHome';
import { BmiPage } from './pages/app/BmiPage';
import { MoodJournalPage } from './pages/app/MoodJournalPage';
import { AiChatPage } from './pages/app/AiChatPage';
import { PlansPage } from './pages/app/PlansPage';
import { RewardsPage } from './pages/app/RewardsPage';
import { CustomerExpertChatPage } from './pages/app/CustomerExpertChatPage';
import { ChooseExpertPage } from './pages/app/ChooseExpertPage';
import { CommunityLayout } from './layouts/CommunityLayout';
import { CommunityForumPage } from './pages/community/CommunityForumPage';
import { CommunityRoomsPage } from './pages/community/CommunityRoomsPage';
import { CommunityAnnouncementsPage } from './pages/community/CommunityAnnouncementsPage';
import { CommunityDmPage } from './pages/community/CommunityDmPage';
import { ExpertLayout } from './layouts/ExpertLayout';
import { LoginHubPage, CustomerLoginPage, ExpertLoginPage } from './pages/DualLoginPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPages';
import { ExpertCustomerListPage } from './pages/expert/ExpertCustomerListPage';
import { ExpertCustomerWorkspacePage } from './pages/expert/ExpertCustomerWorkspacePage';
import { DoctorDashboardPage } from './pages/expert/DoctorDashboardPage';
import { ExpertSettingsPage } from './pages/expert/ExpertSettingsPage';
import { ExpertWeeklyReportPage } from './pages/expert/ExpertWeeklyReportPage';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminExpertManagementPage } from './pages/admin/AdminExpertManagementPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import {
  LegacyAppRedirect,
  LegacyExpertDoctorDeskCustomerRedirect,
  LegacyExpertPatientRedirect,
  LegacyExpertRedirect,
  LegacyAppCommunityRedirect,
  PrefixAliasRedirect,
} from './components/LegacyPathRedirect';
import { useRouteDocument } from './hooks/useRouteDocument';

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
        <Route element={<CustomerAppGate />}>
          <Route index element={<CommunityIndexRedirect />} />
          <Route path="dien-dan" element={<CommunityForumPage />} />
          <Route path="phong-chat" element={<CommunityRoomsPage />} />
          <Route path="thong-bao" element={<CommunityAnnouncementsPage />} />
          <Route path="tin-nhan" element={<CommunityDmPage />} />
        </Route>
      </Route>

      {/* —— Ứng dụng khách hàng (phân cấp) —— */}
      <Route path="/app" element={<UserAppLayout />}>
        <Route element={<CustomerAppGate />}>
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
  );
}

export default function App() {
  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: '#F9F9FB', color: '#1A202C' }}>
      <AppRoutes />
    </div>
  );
}
