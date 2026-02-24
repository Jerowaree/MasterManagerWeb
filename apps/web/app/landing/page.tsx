import Link from "next/link";
import { headers } from "next/headers";
import { CountryPricing } from "../../components/landing/country-pricing";
import { resolveCountryVariant } from "../../lib/landing-config";

type LandingPageProps = {
  searchParams?: {
    country?: string;
  };
};

function detectCountryFromHeaders() {
  const requestHeaders = headers();
  const ipCountry = requestHeaders.get("x-vercel-ip-country")?.toUpperCase();

  if (ipCountry) {
    return ipCountry;
  }

  const acceptedLanguage = requestHeaders.get("accept-language")?.toLowerCase() ?? "";
  if (acceptedLanguage.includes("es-pe")) {
    return "PE";
  }

  return "GLOBAL";
}

export default function LandingPage({ searchParams }: LandingPageProps) {
  const selectedCountry = searchParams?.country?.toUpperCase() ?? detectCountryFromHeaders();
  const variant = resolveCountryVariant(selectedCountry);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 p-8">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-8 text-white">
        <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Master Manager</p>
        <h1 className="text-4xl font-bold">Sistema de ventas, compras e inventario multi-sucursal</h1>
        <p className="text-slate-200">
          Arquitectura multi-tenant, módulos por país y enfoque en eficiencia operativa.
        </p>
        <div className="flex gap-3">
          <Link href="/planes" className="rounded-lg bg-brand-primary px-4 py-2 font-medium">
            Ver planes
          </Link>
          <Link href="/contacto" className="rounded-lg border border-slate-500 px-4 py-2 font-medium">
            Contactar ventas
          </Link>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Planes para {variant.countryCode === "PE" ? "Perú" : "mercado internacional"}</h2>
        <p className="mb-6 text-slate-600">Moneda detectada: {variant.currency}</p>
        <CountryPricing variant={variant} />
      </section>
    </main>
  );
}
