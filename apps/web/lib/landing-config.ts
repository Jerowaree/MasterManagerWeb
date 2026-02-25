export type Currency = "PEN" | "USD";

export type Plan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  target?: string[];
  modules?: string[];
  restrictions?: string[];
  recommended?: boolean;
};

export type CountryVariant = {
  countryCode: string;
  currency: Currency;
  locale: string;
  plans: Plan[];
};

const globalFeatures = {
  dashboard: "Dashboard de ventas, stock y deudas",
  sales: "Nueva venta (POS) y metodos de pago",
  products: "Productos y control de stock minimo",
  debts: "Gestion de fiados y abonos",
  purchases: "Registro de compras con stock automatico",
  basicReports: "Reportes basicos de ventas y productos",
  workers: "Gestion de trabajadores y roles",
  accessControl: "Permisos por modulo",
  advancedReports: "Reportes avanzados por trabajador",
  logs: "Historial de actividad (logs)",
  sessions: "Control individual de sesiones",
};

export const countryVariants: Record<string, CountryVariant> = {
  PE: {
    countryCode: "PE",
    currency: "PEN",
    locale: "es-PE",
    plans: [
      {
        id: "basic",
        name: "Plan Basico",
        description: "Simple, rapido y economico para micro negocios",
        monthlyPrice: 49.9,
        yearlyPrice: 499,
        features: [
          globalFeatures.dashboard,
          globalFeatures.sales,
          globalFeatures.products,
          globalFeatures.debts,
          globalFeatures.purchases,
          globalFeatures.basicReports,
        ],
        target: ["Bodega", "Tienda pequena", "Negocio atendido por el dueno"],
        modules: [
          "Dashboard simple: ventas del dia, ganancia estimada, stock bajo y deudas",
          "POS: crear venta, metodos de pago e impresion de comprobante simple",
          "Productos: crear/editar, precio compra/venta, control de stock y alerta minima",
          "Fiados: registrar deuda, registrar abono e historial de pagos",
          "Compras: registrar compra y actualizar stock automaticamente",
          "Reportes basicos: ventas por dia/mes y productos mas vendidos",
        ],
        restrictions: [
          "Solo 1 usuario (dueno)",
          "Sin roles ni trabajadores",
          "Sin permisos personalizados",
          "Sin reportes avanzados",
        ],
      },
      {
        id: "intermediate",
        name: "Plan Intermedio",
        description: "Pensado para PYMES con empleados y mayor volumen de ventas",
        monthlyPrice: 89.9,
        yearlyPrice: 899,
        recommended: true,
        features: [
          globalFeatures.sales,
          globalFeatures.products,
          globalFeatures.debts,
          globalFeatures.purchases,
          globalFeatures.basicReports,
          globalFeatures.workers,
          globalFeatures.accessControl,
          globalFeatures.advancedReports,
          globalFeatures.logs,
          globalFeatures.sessions,
        ],
        target: ["Negocio con empleados", "2 o mas trabajadores", "Mayor volumen de ventas"],
        modules: [
          "Incluye todo el Plan Basico",
          "Gestion de trabajadores con roles: vendedor, cajero y administrador",
          "Permisos personalizados por accion y modulo",
          "Control de accesos: dashboard, reportes, ganancias, deudas, edicion y eliminacion",
          "Reportes avanzados: ventas por trabajador, rendimiento e historial detallado",
          "Logs de actividad: quien creo, edito o anulo, con fecha y hora",
          "Multiusuario de 3 a 10 usuarios segun plan contratado",
          "Control individual de sesiones",
        ],
      },
    ],
  },
  GLOBAL: {
    countryCode: "GLOBAL",
    currency: "USD",
    locale: "en-US",
    plans: [
      {
        id: "basic-global",
        name: "Basic Plan",
        description: "Simple and affordable for small owner-operated stores",
        monthlyPrice: 14.9,
        yearlyPrice: 149,
        features: [
          globalFeatures.dashboard,
          globalFeatures.sales,
          globalFeatures.products,
          globalFeatures.debts,
          globalFeatures.purchases,
          globalFeatures.basicReports,
        ],
        target: ["Small shop", "Corner store", "Owner-operated business"],
        modules: [
          "Simple dashboard: daily sales, estimated profit, low stock and debts",
          "POS: create sale, payment methods and basic receipt print",
          "Products: CRUD, cost/sale pricing and stock alerts",
          "Debts: register debt, payment and payment history",
          "Purchases with automatic stock update",
          "Basic reports: sales by day/month and top-selling products",
        ],
        restrictions: [
          "Single user only",
          "No roles and no workers",
          "No custom permissions",
          "No advanced reporting",
        ],
      },
      {
        id: "intermediate-global",
        name: "Intermediate Plan",
        description: "For growing businesses with staff and higher sales volume",
        monthlyPrice: 24.9,
        yearlyPrice: 249,
        recommended: true,
        features: [
          globalFeatures.sales,
          globalFeatures.products,
          globalFeatures.debts,
          globalFeatures.purchases,
          globalFeatures.basicReports,
          globalFeatures.workers,
          globalFeatures.accessControl,
          globalFeatures.advancedReports,
          globalFeatures.logs,
          globalFeatures.sessions,
        ],
        target: ["Business with employees", "2+ workers", "Growing sales operations"],
        modules: [
          "Includes everything in Basic Plan",
          "Workers and role management: seller, cashier and admin",
          "Custom permissions by action and module",
          "Access control for reports, dashboard and financial visibility",
          "Advanced reports by employee performance",
          "Full activity logs with user and timestamp",
          "3 to 10 users depending on subscription",
          "Per-user session management",
        ],
      },
    ],
  },
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
    minimumFractionDigits: 2,
  }).format(amount);
}
