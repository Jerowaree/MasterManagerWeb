// app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  TrendingUp,
  MoreVertical,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { DashboardData } from '@/lib/dashboard-types';

const chartData = [
  { name: '1 Feb', value: 40000 },
  { name: '5 Feb', value: 35000 },
  { name: '10 Feb', value: 75000 },
  { name: '15 Feb', value: 60000 },
  { name: '20 Feb', value: 136755 },
];

const categoryData = [
  { name: 'Electrónica', value: 55640, color: '#a78bfa' },
  { name: 'Muebles', value: 11420, color: '#8b5cf6' },
  { name: 'Ropa', value: 1840, color: '#7c3aed' },
  { name: 'Calzado', value: 2120, color: '#6d28d9' },
];

export default function DashboardPage() {
  const { showToast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const response = await api.reports.getDashboard();
      return response.data as DashboardData;
    },
  });

  useEffect(() => {
    if (error instanceof Error) {
      showToast(error.message || 'Error al cargar dashboard', 'error');
    }
  }, [error, showToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white dark:bg-[#0a0a0a] min-h-screen">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalRevenue: 3131021,
    todayRevenue: 1511121,
    customerCount: 862,
    branchCount: 18221,
  };
  const recentSales = data?.recentSales || [];

  return (
    <div className="space-y-8 min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white pb-10">
      
      {/* HEADER: Igual a CajaPage */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-heading">
            Resumen General
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visualiza el rendimiento global, ingresos y métricas clave de tu negocio.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-black dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm">
            Hoy ▾
          </div>
        </div>
      </div>

      {/* GRID ESTADÍSTICAS: Espaciado gap-6 igual a Caja */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos Netos"
          value={`S/ ${stats.totalRevenue.toLocaleString()}`}
          trend="0.4%"
          positive
        />
        <StatCard
          title="Ingresos Anuales (ARR)"
          value={`S/ ${stats.todayRevenue.toLocaleString()}`}
          trend="32%"
          positive
        />
        <StatCard
          title="Meta de ingresos trimestral"
          value="71%"
          subValue="Meta: S/ 1.1M"
          isProgress
        />
        <StatCard
          title="Nuevos pedidos"
          value={stats.branchCount.toLocaleString()}
          trend="11%"
          positive
        />
      </div>

      {/* SECCIÓN MEDIA: Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-50 dark:bg-[#141414] rounded-3xl p-6 border border-gray-200 dark:border-white/5 relative shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white">Resumen de Ventas</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="p-2 bg-white dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Monto Total</p>
                  <p className="text-xl font-bold">S/ 71,020</p>
                </div>
              </div>
            </div>
            <MoreVertical className="text-gray-400 cursor-pointer" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 items-center">
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-2xl font-bold text-black dark:text-white">102k</p>
                <p className="text-[10px] text-gray-500 uppercase font-black">VISITAS</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {categoryData.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-gray-500">{cat.name}</span>
                  </div>
                  <p className="text-sm font-bold">S/ {cat.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Card Clientes */}
          <div className="bg-white dark:bg-[#141414] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-violet-400/10 rounded-lg text-violet-500">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg font-bold">-8%</span>
            </div>
            <p className="text-xs text-gray-500 mt-4 font-medium uppercase tracking-wider">Nuevos clientes:</p>
            <p className="text-2xl font-bold text-black dark:text-white">862</p>
            <p className="text-[10px] text-gray-400 italic">vs. Semana pasada</p>
          </div>

          {/* Card Gráfico Área */}
          <div className="bg-white dark:bg-[#141414] rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="p-6 pb-0">
              <p className="text-xs text-gray-500 font-black uppercase tracking-widest mb-1">Ganancia Total</p>
              <p className="text-2xl font-bold text-black dark:text-white tracking-tight">S/ 136,755.77</p>
              <p className="text-[10px] text-gray-400 mt-1">Febrero 2024</p>
            </div>
            <div className="h-32 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: Tabla y Card Premium */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#141414] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-black dark:text-white">Lista de clientes</h3>
            <MoreVertical className="text-gray-400 cursor-pointer" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 dark:border-white/5">
                  <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Nombre ⇅</th>
                  <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Tratos ⇅</th>
                  <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Valor Total ⇅</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {(recentSales.length > 0 ? recentSales : [1, 2, 3]).slice(0, 3).map((sale: any, i) => (
                  <tr key={i} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-violet-500/20">
                        {sale.customer?.name?.[0] || 'D'}
                      </div>
                      <div>
                        <p className="font-bold text-black dark:text-white">{sale.customer?.name || 'Danny Liu'}</p>
                        <p className="text-xs text-gray-400">{sale.customer?.email || 'danny@gmail.com'}</p>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-gray-600 dark:text-gray-400">1,023</td>
                    <td className="py-4 font-bold text-black dark:text-white">S/ {(37431 - i * 5000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TARJETA PREMIUM (Diseño original restaurado con mejoras de CajaPage) */}
        <div className="bg-gradient-to-br from-violet-100 dark:from-[#1e1435] to-white dark:to-[#0a0a0a] rounded-3xl p-8 border border-violet-500/20 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 bg-violet-500/10 w-fit px-3 py-1 rounded-full border border-violet-500/20 mb-6">
              <Zap className="w-3 h-3 text-violet-500 fill-violet-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Plan Premium</span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-black text-gray-900 dark:text-white">S/ 30</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">/ Mes por usuario</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              Mejora tu espacio de trabajo, visualiza y analiza tus pérdidas y ganancias detalladamente.
            </p>
          </div>
          <button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl transition-all mt-8 relative z-10 shadow-lg shadow-violet-600/20 active:scale-[0.98]">
            Empezar Ahora
          </button>
        </div>
      </div>
    </div>
  );
}

// COMPONENTE STATCARD: Estilo pulido de CajaPage
function StatCard({ title, value, trend, positive, subValue, isProgress }: any) {
  return (
    <div className="bg-white dark:bg-[#141414] p-6 rounded-3xl border border-gray-200 dark:border-white/5 space-y-3 hover:border-violet-500/30 transition-all shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</p>
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-black dark:text-white tracking-tight">
          {value}
        </span>
        {isProgress ? (
          <div className="mt-3 h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full w-[71%]" />
          </div>
        ) : (
          <div className={cn('flex items-center text-xs mt-2 font-bold', positive ? 'text-emerald-500' : 'text-rose-500')}>
            {positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {trend} <span className="text-gray-400 ml-1 font-medium">vs último mes</span>
          </div>
        )}
        {subValue && <p className="text-[10px] text-gray-400 mt-2 font-medium">{subValue}</p>}
      </div>
    </div>
  );
}