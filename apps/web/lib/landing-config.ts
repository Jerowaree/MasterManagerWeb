export type Currency = "PEN" | "USD";

export type Plan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  recommended?: boolean;
};

export type CountryVariant = {
  countryCode: string;
  currency: Currency;
  locale: string;
  plans: Plan[];
};

const globalFeatures = {
  inventory: "Control de inventario multi-sucursal",
  sales: "Ventas y Facturación",
  reports: "Reportes Avanzados",
  purchases: "Gestión de Compras",
  fiscalPE: "Cumplimiento Fiscal SUNAT",
  multibranch: "Uso Multi-Sucursal",
  support: "Soporte 24/7",
  api: "Acceso a API Rest",
  users: "Usuarios Ilimitados"
};

export const countryVariants: Record<string, CountryVariant> = {
  PE: {
    countryCode: "PE",
    currency: "PEN",
    locale: "es-PE",
    plans: [
      {
        id: "lite",
        name: "Emprendedor",
        description: "Ideal para iniciar",
        monthlyPrice: 49.90,
        yearlyPrice: 499,
        features: [globalFeatures.sales, globalFeatures.inventory, "Hasta 2 sucursales"]
      },
      {
        id: "pro",
        name: "Crecimiento",
        description: "El más popular para PYMES",
        monthlyPrice: 89.90,
        yearlyPrice: 899,
        recommended: true,
        features: [
          globalFeatures.sales, 
          globalFeatures.inventory, 
          globalFeatures.reports, 
          globalFeatures.fiscalPE,
          "Sucursales Ilimitadas"
        ]
      },
      {
        id: "enterprise",
        name: "Corporativo",
        description: "Control total de tu imperio",
        monthlyPrice: 149.90,
        yearlyPrice: 1499,
        features: [
          globalFeatures.sales,
          globalFeatures.inventory,
          globalFeatures.reports,
          globalFeatures.purchases,
          globalFeatures.fiscalPE,
          globalFeatures.api,
          globalFeatures.support
        ]
      }
    ]
  },
  GLOBAL: {
    countryCode: "GLOBAL",
    currency: "USD",
    locale: "en-US",
    plans: [
      {
        id: "lite-global",
        name: "Starter",
        description: "Perfect for new businesses",
        monthlyPrice: 14.90,
        yearlyPrice: 149,
        features: [globalFeatures.sales, globalFeatures.inventory, "Up to 2 branches"]
      },
      {
        id: "pro-global",
        name: "Professional",
        description: "Scale your operation",
        monthlyPrice: 24.90,
        yearlyPrice: 249,
        recommended: true,
        features: [
          globalFeatures.sales,
          globalFeatures.inventory,
          globalFeatures.reports,
          globalFeatures.multibranch
        ]
      },
      {
        id: "enterprise-global",
        name: "Enterprise",
        description: "Unlimited scale and features",
        monthlyPrice: 39.90,
        yearlyPrice: 399,
        features: [
          globalFeatures.sales,
          globalFeatures.inventory,
          globalFeatures.reports,
          globalFeatures.purchases,
          globalFeatures.api,
          globalFeatures.support
        ]
      }
    ]
  }
};

export function resolveCountryVariant(countryCode?: string): CountryVariant {
  if (countryCode === "PE") {
    return countryVariants.PE;
  }
  return countryVariants.GLOBAL;
}

export function formatPrice(amount: number, currency: Currency, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}
