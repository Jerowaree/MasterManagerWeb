// app/layout.tsx
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "../app/providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Master Manager",
  description: "Sistema de gestión empresarial multi-sucursal"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="antialiased font-sans tabular-nums">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}