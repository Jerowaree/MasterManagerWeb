import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Master Manager",
  description: "Sistema de gestión empresarial multi-sucursal"
};

import { AuthProvider } from "../contexts/auth-context";
import { CompanyProvider } from "../contexts/company-context";
import { ToastProvider } from "../contexts/ToastContext";
import { AppQueryProvider } from "../contexts/query-provider";

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${outfit.variable}`}>
      <body className="antialiased font-sans tabular-nums">
        <AppQueryProvider>
          <ToastProvider>
            <AuthProvider>
              <CompanyProvider>
                {children}
              </CompanyProvider>
            </AuthProvider>
          </ToastProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
