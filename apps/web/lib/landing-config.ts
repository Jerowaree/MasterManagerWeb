export type Currency = "PEN" | "USD";

export type Plan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
};

export type CountryVariant = {
  countryCode: string;
  currency: Currency;
  locale: string;
  plans: Plan[];
};

const globalFeatures = {
  inventory: "Control de inventario por sucursal",
  sales: "Gestión de ventas y clientes",
  reports: "Reportes operativos en tiempo real",
  purchases: "Gestión de compras y proveedores",
  fiscalPE: "Reglas fiscales para SUNAT (Perú)",
  multibranch: "Operación multi-sucursal",
  support: "Soporte prioritario"
};

export const countryVariants: Record<string, CountryVariant> = {
  PE: {
    countryCode: "PE",
    currency: "PEN",
    locale: "es-PE",
    plans: [
      {
        id: "inicio",
        name: "Inicio",
        description: "Para negocios en crecimiento",
        monthlyPrice: 79,
        yearlyPrice: 790,
        features: [globalFeatures.sales, globalFeatures.inventory, globalFeatures.multibranch]
      },
      {
        id: "pro-pe",
        name: "Pro Perú",
        description: "Incluye cumplimiento fiscal local",
        monthlyPrice: 149,
        yearlyPrice: 1490,
        features: [
          globalFeatures.sales,
          globalFeatures.inventory,
          globalFeatures.purchases,
          globalFeatures.reports,
          globalFeatures.fiscalPE,
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
        id: "starter",
        name: "Starter",
        description: "Simple operations for SMBs",
        monthlyPrice: 29,
        yearlyPrice: 290,
        features: [globalFeatures.sales, globalFeatures.inventory]
      },
      {
        id: "growth",
        name: "Growth",
        description: "Advanced multi-branch workflows",
        monthlyPrice: 59,
        yearlyPrice: 590,
        features: [
          globalFeatures.sales,
          globalFeatures.inventory,
          globalFeatures.purchases,
          globalFeatures.reports,
          globalFeatures.multibranch,
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
    maximumFractionDigits: 0
  }).format(amount);
}
