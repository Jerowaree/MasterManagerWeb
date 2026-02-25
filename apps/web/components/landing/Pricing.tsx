"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';
import { CountryVariant, formatPrice } from '@/lib/landing-config';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PricingProps {
  variant: CountryVariant;
}

export function Pricing({ variant }: PricingProps) {
  return (
    <section id="pricing" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">Inversión justa para <br/><span className="text-purple-600">cada etapa.</span></h2>
          <p className="text-gray-500 text-lg">
            Planes diseñados para {variant.countryCode === 'PE' ? 'empresas peruanas' : 'negocios internacionales'} con facturación local y soporte especializado.
          </p>
          <div className="inline-flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full border border-purple-100">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" /> Precios Transparentes en {variant.currency}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {variant.plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "relative p-8 rounded-3xl border transition-all duration-300 flex flex-col h-full",
                plan.recommended 
                  ? "bg-black text-white border-black shadow-2xl shadow-purple-200" 
                  : "bg-white text-black border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-gray-100"
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Recomendado
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className={cn("text-sm", plan.recommended ? "text-gray-400" : "text-gray-500")}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold tabular-nums">
                    {formatPrice(plan.monthlyPrice, variant.currency, variant.locale)}
                  </span>
                  <span className={cn("text-sm mb-1.5", plan.recommended ? "text-gray-400" : "text-gray-500")}>
                    /mes
                  </span>
                </div>
                <div className={cn("text-xs font-semibold mt-2", plan.recommended ? "text-purple-400" : "text-purple-600")}>
                  O ahorra {formatPrice(plan.yearlyPrice, variant.currency, variant.locale)} al año
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={cn("w-5 h-5 shrink-0 mt-0.5", plan.recommended ? "text-purple-500" : "text-purple-600")} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href="/register"
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-center transition-all",
                  plan.recommended 
                    ? "bg-purple-600 text-white hover:bg-purple-700" 
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                )}
              >
                Comenzar Prueba Gratis
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center mt-12 text-sm text-gray-400">
          ¿Necesitas algo a medida? <Link href="/contacto" className="underline font-bold hover:text-purple-600">Contacta con ventas corporativas</Link>
        </p>
      </div>
    </section>
  );
}
