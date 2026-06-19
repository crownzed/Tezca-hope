import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { OfflineBanner } from './app/components/OfflineBanner';
import { initErrorMonitoring } from './app/lib/errorMonitoring';
import { initAnalytics } from './app/lib/analytics';
import { registerServiceWorker } from './app/lib/pwa';
import { CustomerAuthProvider } from './app/context/CustomerAuthContext';
import { ExpertAuthProvider } from './app/context/ExpertAuthContext';
import { AdminAuthProvider } from './app/context/AdminAuthContext';
import App from './app/App.tsx';
import './styles/index.css';

// Khởi động error monitoring sớm nhất có thể
initErrorMonitoring();
initAnalytics();

/** Khi build với VITE_BASE_PATH=/tezca/ — router khớp URL trên website có sẵn */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <OfflineBanner />
      <BrowserRouter basename={routerBasename || undefined}>
        <CustomerAuthProvider>
          <ExpertAuthProvider>
            <AdminAuthProvider>
              <App />
              <Toaster position="top-center" richColors closeButton theme="light" />
            </AdminAuthProvider>
          </ExpertAuthProvider>
        </CustomerAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Đăng ký Service Worker sau khi app mount
registerServiceWorker();
  