"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, Zap, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="pt-32 pb-20 md:pt-48 md:pb-32 bg-[#fcfcfc] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-purple-100 rounded-full blur-[140px] opacity-50 pointer-events-none" />

        <div className="text-center space-y-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full border border-black/5"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-900">Seguridad SOC2 Tipo II Certificada</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-black max-w-5xl mx-auto leading-[0.95]"
          >
            Gestiona tu imperio con <br/>
            <span className="text-purple-600">precisión absoluta.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Ventas, inventario y facturación fiscal en una sola plataforma blindada. Toma el control de todas tus sucursales desde un solo dashboard.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-5 bg-black text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-black/20 transform hover:-translate-y-1 active:translate-y-0"
            >
              Comenzar Mi Prueba Gratis
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link 
              href="#pricing" 
              className="w-full sm:w-auto px-8 py-5 bg-white text-black border border-gray-100 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all shadow-sm"
            >
              Ver Planes Localizados
            </Link>
          </motion.div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Zap, label: 'Tiempo Real', desc: 'Sync instantánea' },
            { icon: Users, label: 'Multi-Tenant', desc: 'Aislamiento total' },
            { icon: BarChart3, label: 'BI Integrado', desc: 'Análisis de datos' },
            { icon: ShieldCheck, label: 'Backup 24h', desc: 'Datos seguros' }
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              className="text-center p-6 bg-white rounded-3xl border border-gray-50 shadow-sm"
            >
              <item.icon className="w-6 h-6 text-purple-600 mx-auto mb-3" />
              <div className="font-bold text-black text-sm">{item.label}</div>
              <div className="text-gray-400 text-xs">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
