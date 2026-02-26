"use client";

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { DashboardData, Sale } from '@/lib/dashboard-types';

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
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalRevenue: 0,
    todayRevenue: 0,
    customerCount: 0,
    branchCount: 0
  };
  
  const recentSales = data?.recentSales || [];

  return (
    <div className="space-y-10">
      {/* Welcome Message */}
      <div>
        <h1 className="text-3xl font-bold text-black font-heading">Resumen del Negocio</h1>
        <p className="text-gray-500">Aquí tienes un vistazo rápido de lo que está sucediendo hoy.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ventas del Día" 
          value={`S/ ${Number(stats.todayRevenue).toFixed(2)}`} 
          trend={`${stats.revenueTrend || 0}%`} 
          positive={Number(stats.revenueTrend) >= 0} 
        />
        <StatCard 
          title="Ventas Totales" 
          value={`S/ ${Number(stats.totalRevenue).toFixed(2)}`} 
          trend="Histórico" 
          positive 
        />
        <StatCard title="Total Clientes" value={stats.customerCount} trend="Activos" positive />
        <StatCard title="Sucursales" value={stats.branchCount} trend="Operativas" positive />
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Ventas Recientes</h3>
            <button className="text-sm font-bold text-[#7c3aed] hover:underline">Ver todas las ventas</button>
          </div>
          <div className="space-y-6">
            {recentSales.length > 0 ? recentSales.map((sale: Sale) => (
              <TransactionItem 
                key={sale.id}
                client={sale.customer?.name || 'Venta Rápida'} 
                amount={`S/ ${Number(sale.total).toFixed(2)}`} 
                status={sale.status === 'paid' ? 'Completado' : 'Pendiente'} 
                time={new Date(sale.createdAt).toLocaleTimeString()} 
              />
            )) : (
              <p className="text-center text-gray-400 py-10 italic">No hay ventas registradas recientemente.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
          <h3 className="text-xl font-bold">Estado de Sucursales</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-500">Sedes Activas</span>
              <span className="text-black tabular-nums font-bold">{stats.branchCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-500">Promedio Diario</span>
              <span className="text-green-600 tabular-nums">S/ {(stats.todayRevenue / (stats.branchCount || 1)).toFixed(2)}</span>
            </div>
            <div className="pt-4 border-t">
               <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <p className="text-xs text-purple-700 font-medium leading-relaxed">
                     Tip: Recuerda revisar el stock de tus sucursales con menor rotación.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string | number;
  trend: string;
  positive: boolean;
};

function StatCard({ title, value, trend, positive }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2 hover:shadow-md transition-shadow">
      <div className="text-gray-500 text-sm font-medium">{title}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-black tabular-nums font-heading">{value}</div>
        <div className={cn(
          "flex items-center text-xs font-bold px-2 py-1 rounded-full",
          positive ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
        )}>
          {positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {trend}
        </div>
      </div>
    </div>
  );
}

type TransactionItemProps = {
  client: string;
  amount: string;
  status: string;
  time: string;
};

function TransactionItem({ client, amount, status, time }: TransactionItemProps) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center font-bold text-gray-400 group-hover:bg-purple-50 group-hover:text-[#7c3aed] transition-colors">
          {client[0]}
        </div>
        <div>
          <div className="font-bold text-sm text-black">{client}</div>
          <div className="text-xs text-gray-400">{time}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-sm text-black tabular-nums">{amount}</div>
        <div className={cn(
          "text-[10px] font-black uppercase tracking-widest",
          status === 'Completado' ? 'text-green-500' : 'text-orange-500'
        )}>{status}</div>
      </div>
    </div>
  );
}

