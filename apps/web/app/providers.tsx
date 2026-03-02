// app/providers.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/auth-context';
import { CompanyProvider } from '../contexts/company-context';
import { ToastProvider } from '../contexts/ToastContext';
import { AppQueryProvider } from '../contexts/query-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppQueryProvider>
      <ToastProvider>
        <AuthProvider>
          <CompanyProvider>
            <NextThemesProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </NextThemesProvider>
          </CompanyProvider>
        </AuthProvider>
      </ToastProvider>
    </AppQueryProvider>
  );
}