import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppRouter } from './routes/AppRouter';
import { queryClient } from './app/queryClient';
import { AuthProvider } from './features/auth/AuthProvider';
import { PropertyProvider } from './contexts/PropertyContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PropertyProvider>
          <AppRouter />
          <Toaster position="top-right" />
        </PropertyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
