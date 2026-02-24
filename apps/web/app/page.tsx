import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-start justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Dashboard Master Manager</h1>
      <p className="text-slate-600">Aplicación principal separada de la landing comercial.</p>
      <Link href="/landing" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
        Ir a landing
      </Link>
    </main>
  );
}
