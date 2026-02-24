import { formatPrice, type CountryVariant } from "../../lib/landing-config";

type CountryPricingProps = {
  variant: CountryVariant;
};

export function CountryPricing({ variant }: CountryPricingProps) {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      {variant.plans.map((plan) => (
        <article key={plan.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
          <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
          <p className="mt-4 text-3xl font-bold text-brand-primary">
            {formatPrice(plan.monthlyPrice, variant.currency, variant.locale)}
            <span className="text-sm font-medium text-slate-500">/mes</span>
          </p>
          <p className="text-sm text-slate-500">
            {formatPrice(plan.yearlyPrice, variant.currency, variant.locale)} anual
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
