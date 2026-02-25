"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ShoppingCart, 
  LayoutDashboard, 
  ShieldAlert, 
  Globe2, 
  Smartphone,
  Database,
  LineChart
} from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: "Multi-Sucursal Nativo",
    description: "Coordina inventarios y ventas de múltiples locales en tiempo real sin desfases."
  },
  {
    icon: ShoppingCart,
    title: "Punto de Venta Ágil",
    description: "Una interfaz diseñada para la velocidad. Procesa transacciones en segundos."
  },
  {
    icon: LayoutDashboard,
    title: "Módulo Perú Fiscal",
    description: "Integración directa con los estándares de SUNAT para facturación y libros electrónicos."
  },
  {
    icon: ShieldAlert,
    title: "Seguridad de Aislamiento",
    description: "Cada empresa opera en su propia burbuja lógica. Tus datos nunca se cruzan."
  },
  {
    icon: Globe2,
    title: "Gestión Internacional",
    description: "Selecciona tu país y adapta monedas e impuestos de forma automática."
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Accede a tus reportes y supervisa stock desde cualquier dispositivo móvil."
  },
  {
    icon: Database,
    title: "Kardex Valorizado",
    description: "Control exacto de costos y valoración de existencias con métodos FIFO/Promedio."
  },
  {
    icon: LineChart,
    title: "BI & Analytics",
    description: "Gráficos avanzados para entender tendencias y proyectar el crecimiento de tu negocio."
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <h2 className="text-4xl font-bold tracking-tight">Potencia diseñada para <br/><span className="text-purple-600">gerentes exigentes.</span></h2>
          <p className="text-gray-500 text-lg">
            No somos solo un software de ventas. Somos tu centro de comando empresarial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group p-8 rounded-3xl border border-gray-100 bg-white hover:border-purple-200 hover:shadow-2xl hover:shadow-purple-50 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
