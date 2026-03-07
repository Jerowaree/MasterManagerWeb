// app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
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
import { DashboardData, Sale } from '@/lib/dashboard-types';

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
  const { theme } = useTheme();
  
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
      <div className="flex items-center justify-center py-20 bg-white dark:bg-transparent min-h-screen">
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
  const recentSales: Sale[] = data?.recentSales ?? [];
  const fallbackSales: Sale[] = [
    {
      id: 'fallback-1',
      total: 37431,
      status: 'paid',
      createdAt: new Date().toISOString(),
      customer: { name: 'Danny Liu', email: 'danny.liu@ejemplo.com' },
      branch: null,
    },
    {
      id: 'fallback-2',
      total: 32431,
      status: 'paid',
      createdAt: new Date().toISOString(),
      customer: { name: 'Maria Lopez', email: 'maria.lopez@ejemplo.com' },
      branch: null,
    },
    {
      id: 'fallback-3',
      total: 27431,
      status: 'paid',
      createdAt: new Date().toISOString(),
      customer: { name: 'Jose Perez', email: 'jose.perez@ejemplo.com' },
      branch: null,
    },
  ];
  const displaySales = recentSales.length > 0 ? recentSales : fallbackSales;

  return (
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER MEJORADO: Alineación a los extremos */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
            Resumen General
          </h1>
          <div className="px-4 py-2 md:py-2.5 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-xl md:rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex items-center gap-2 shrink-0">
            <span>Hoy</span>
            <span className="text-[10px] text-gray-400">▼</span>
          </div>
        </div>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 pr-12 md:pr-0">
          Visualiza el rendimiento global, ingresos y métricas clave de tu negocio.
        </p>
      </div>

      {/* GRID ESTADÍSTICAS - 2x2 en móvil, 4 en PC */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Ingresos Netos"
          value={`S/ ${stats.totalRevenue.toLocaleString()}`}
          trend="0.4%"
          positive
        />
        <StatCard
          title="Ingresos (ARR)"
          value={`S/ ${stats.todayRevenue.toLocaleString()}`}
          trend="32%"
          positive
        />
        <StatCard
          title="Meta trimestral"
          value="71%"
          subValue="Objetivo: S/ 1.1M"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-gray-50/30 dark:bg-white/5 dark:backdrop-blur-xl rounded-3xl p-5 md:p-7 border border-gray-200/80 dark:border-white/10 relative shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Resumen de Ventas</h3>
              <div className="flex items-center gap-3 mt-3">
                <div className="p-2.5 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Monto Total</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white tracking-tight">S/ 71,020</p>
                </div>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-4 mt-4">
            <div className="h-60 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? 'rgba(15, 10, 30, 0.8)' : '#fff', 
                      backdropFilter: 'blur(16px)',
                      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', 
                      borderRadius: '16px', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#1f2937', fontWeight: 'bold' }}
                    cursor={{ fill: 'transparent' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center justify-center">
                <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">102k</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Visitas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {categoryData.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{cat.name}</span>
                  </div>
                  <p className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200">S/ {cat.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 flex flex-col">
          {/* Card Clientes */}
          <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] group hover:border-violet-500/30 transition-all flex-1">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-violet-50/50 dark:bg-violet-500/10 rounded-xl text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-lg font-semibold tracking-wide">-8%</span>
            </div>
            <div className="mt-5">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Nuevos clientes</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">862</p>
                <p className="text-[10px] text-gray-400 font-medium">vs. sem. pasada</p>
              </div>
            </div>
          </div>

          {/* Card Gráfico Área */}
          <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl rounded-3xl border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:border-violet-500/30 transition-all">
            <div className="p-5 md:p-6 pb-2">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">Ganancia Total</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">S/ 136,755</p>
                <p className="text-[10px] text-gray-400 font-medium">Feb 2024</p>
              </div>
            </div>
            <div className="h-28 md:h-32 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-white/5 dark:backdrop-blur-xl rounded-3xl p-5 md:p-7 border border-gray-200/80 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Top Clientes Recientes</h3>
            <button className="text-sm font-semibold text-violet-600 dark:text-purple-400 hover:text-violet-700 dark:hover:text-purple-300 transition-colors">Ver todos</button>
          </div>
          <div className="overflow-x-auto no-scrollbar flex-1">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 dark:border-white/10">
                  <th className="pb-4 font-semibold uppercase tracking-wider text-[10px]">Cliente</th>
                  <th className="pb-4 font-semibold uppercase tracking-wider text-[10px]">Tratos Cerrados</th>
                  <th className="pb-4 font-semibold uppercase tracking-wider text-[10px] text-right pr-4">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {displaySales.slice(0, 3).map((sale, i) => (
                  <tr key={sale.id || `sale-${i}`} className="group hover:bg-gray-50/50 dark:hover:bg-white/10 transition-colors">
                    <td className="py-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                        {sale.customer?.name?.[0] || 'D'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white text-sm md:text-base">{sale.customer?.name || 'Danny Liu'}</p>
                        <p className="text-[10px] md:text-xs text-gray-400 font-medium">{sale.customer?.email || 'danny.liu@ejemplo.com'}</p>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-gray-500 dark:text-gray-400">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 text-xs border border-gray-100 dark:border-white/10">
                        1,023
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-gray-800 dark:text-white text-right pr-4">
                      S/ {(37431 - i * 5000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TARJETA PREMIUM */}
        <div className="bg-gradient-to-br from-violet-50/80 dark:from-violet-600/20 to-white dark:to-white/5 dark:backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-violet-200/50 dark:border-white/10 flex flex-col justify-between relative overflow-hidden shadow-sm group hover:border-violet-300 dark:hover:border-purple-500/40 transition-colors">
          <div className="absolute top-0 right-0 w-40 h-40 bg-violet-400/10 dark:bg-purple-500/20 blur-3xl -mr-16 -mt-16 group-hover:bg-violet-400/20 dark:group-hover:bg-purple-500/30 transition-colors duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 bg-white/60 dark:bg-purple-500/20 w-fit px-3 py-1.5 rounded-full border border-violet-100 dark:border-purple-500/30 mb-5 md:mb-6 shadow-sm backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-violet-600 dark:text-purple-300 fill-violet-600 dark:fill-purple-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-purple-200">Plan Premium</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">S/ 30</span>
              <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">/ Mes por usuario</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium pr-4">
              Mejora tu espacio de trabajo, visualiza y analiza tus pérdidas y ganancias detalladamente sin límites.
            </p>
          </div>
          <button className="w-full bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-medium py-3.5 md:py-4 rounded-2xl transition-all mt-6 md:mt-8 relative z-10 shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 active:scale-[0.98] text-sm md:text-base">
            Mejorar Plan Ahora
          </button>
        </div>
      </div>
    </div>
  );
}

// COMPONENTE STATCARD PULIDO 
function StatCard({ title, value, trend, positive, subValue, isProgress }: {
  title: string;
  value: string | number;
  trend?: string;
  positive?: boolean;
  subValue?: string;
  isProgress?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-200/80 dark:border-white/10 flex flex-col justify-between hover:border-violet-300 dark:hover:border-purple-500/30 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] overflow-hidden relative group min-h-[110px] md:min-h-[140px]">
      
      {/* Brillo sutil de fondo al pasar el hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-transparent group-hover:from-violet-50/50 dark:group-hover:from-purple-500/10 transition-all duration-500 pointer-events-none" />

      <p className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 leading-tight mb-2 relative z-10 truncate">
        {title}
      </p>
      
      <div className="flex flex-col relative z-10">
        <span 
          title={String(value)} /* <--- AQUÍ ESTÁ LA CORRECCIÓN */
          className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight truncate"
        >
          {value}
        </span>
        
        {isProgress ? (
          <div className="mt-2.5 md:mt-3 h-1.5 md:h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 dark:bg-purple-500 rounded-full w-[71%] relative">
              <div className="absolute inset-0 bg-white/20 w-full animate-pulse" />
            </div>
          </div>
        ) : (
          <div className={cn('flex items-center text-[10px] md:text-xs mt-1 md:mt-2 font-semibold', positive ? 'text-emerald-500' : 'text-rose-500')}>
            {positive ? <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5" />}
            <span>{trend}</span> 
            <span className="text-gray-400 ml-1.5 font-medium truncate opacity-70">vs mes ant.</span>
          </div>
        )}
        
        {subValue && <p className="text-[9px] md:text-[10px] text-gray-400 mt-1 md:mt-2 font-medium truncate">{subValue}</p>}
      </div>
    </div>
  );
}