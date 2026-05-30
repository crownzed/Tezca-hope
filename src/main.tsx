import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { CustomerAuthProvider } from './app/context/CustomerAuthContext';
import { ExpertAuthProvider } from './app/context/ExpertAuthContext';
import { AdminAuthProvider } from './app/context/AdminAuthContext';
import App from './app/App.tsx';
import './styles/index.css';

/** Khi build với VITE_BASE_PATH=/tezca/ — router khớp URL trên website có sẵn */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>,
);
  