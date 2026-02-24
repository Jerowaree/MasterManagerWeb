import type { ReactNode } from "react";

export const metadata = {
  title: "Master Manager Web",
  description: "Monorepo Next.js + NestJS + Prisma + PostgreSQL"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

