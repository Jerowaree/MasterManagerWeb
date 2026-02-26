export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export type PlanPricing = {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
};

const PE_PLANS: PlanPricing[] = [
  {
    id: 'basic',
    name: 'Plan Basico',
    monthlyPrice: 49.9,
    yearlyPrice: 499,
    currency: 'PEN',
  },
  {
    id: 'intermediate',
    name: 'Plan Intermedio',
    monthlyPrice: 89.9,
    yearlyPrice: 899,
    currency: 'PEN',
  },
];

const GLOBAL_PLANS: PlanPricing[] = [
  {
    id: 'basic-global',
    name: 'Basic Plan',
    monthlyPrice: 14.9,
    yearlyPrice: 149,
    currency: 'USD',
  },
  {
    id: 'intermediate-global',
    name: 'Intermediate Plan',
    monthlyPrice: 24.9,
    yearlyPrice: 249,
    currency: 'USD',
  },
];

export function resolvePlansByCountry(country?: string) {
  if ((country ?? '').toUpperCase() === 'PE') {
    return PE_PLANS;
  }
  return GLOBAL_PLANS;
}

export function resolvePlanById(country: string | undefined, planId: string) {
  const plans = resolvePlansByCountry(country);
  return plans.find((plan) => plan.id === planId) ?? null;
}
