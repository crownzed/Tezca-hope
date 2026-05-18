import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { PatientAuthProvider } from './app/context/PatientAuthContext';
import { ExpertAuthProvider } from './app/context/ExpertAuthContext';
import App from './app/App.tsx';
import './styles/index.css';

/** Khi build với VITE_BASE_PATH=/tezca/ — router khớp URL trên website có sẵn */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename || undefined}>
      <PatientAuthProvider>
        <ExpertAuthProvider>
          <App />
        </ExpertAuthProvider>
      </PatientAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
  