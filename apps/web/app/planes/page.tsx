import { headers } from "next/headers";
import { CountryPricing } from "../../components/landing/country-pricing";
import { resolveCountryVariant } from "../../lib/landing-config";

export default function PlanesPage() {
  const country = headers().get("x-vercel-ip-country")?.toUpperCase();
  const variant = resolveCountryVariant(country);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Planes</h1>
      <p className="mb-6 text-slate-600">Selecciona el plan ideal para tu negocio.</p>
      <CountryPricing variant={variant} />
    </main>
  );
}
