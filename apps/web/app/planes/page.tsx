import { headers } from "next/headers";
import { CountryPricing } from "../../components/landing/country-pricing";
import { resolveCountryVariant } from "../../lib/landing-config";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PlanesPage() {
  const country = headers().get("x-vercel-ip-country")?.toUpperCase();
  const variant = resolveCountryVariant(country);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-grow px-6 pt-28 pb-16">
        <h1 className="mb-2 text-3xl font-bold">Planes</h1>
        <p className="mb-8 text-slate-600">Selecciona el plan ideal para tu negocio.</p>
        <CountryPricing variant={variant} />

        <section className="mt-14 space-y-8" aria-labelledby="plan-details-title">
          <h2 id="plan-details-title" className="text-2xl font-bold text-slate-900">
            Detalle de funcionalidades por plan
          </h2>

          <div className="grid gap-6">
            {variant.plans.map((plan) => (
              <article key={`${plan.id}-detail`} className="rounded-2xl border border-slate-200 bg-white p-6">
                <header>
                  <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                </header>

                {plan.target && plan.target.length > 0 && (
                  <section className="mt-5" aria-labelledby={`${plan.id}-target`}>
                    <h4 id={`${plan.id}-target`} className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      Pensado para
                    </h4>
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                      {plan.target.map((item) => (
                        <li key={`${plan.id}-target-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {plan.modules && plan.modules.length > 0 && (
                  <section className="mt-5" aria-labelledby={`${plan.id}-includes`}>
                    <h4 id={`${plan.id}-includes`} className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      Incluye
                    </h4>
                    <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700 space-y-1">
                      {plan.modules.map((item) => (
                        <li key={`${plan.id}-module-${item}`}>{item}</li>
                      ))}
                    </ol>
                  </section>
                )}

                {plan.restrictions && plan.restrictions.length > 0 && (
                  <section className="mt-5" aria-labelledby={`${plan.id}-restrictions`}>
                    <h4
                      id={`${plan.id}-restrictions`}
                      className="text-sm font-bold uppercase tracking-wide text-red-700"
                    >
                      Restricciones
                    </h4>
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                      {plan.restrictions.map((item) => (
                        <li key={`${plan.id}-restriction-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
