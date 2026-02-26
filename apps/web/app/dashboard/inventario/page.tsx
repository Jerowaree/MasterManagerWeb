"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, Save, Loader2, Coins, BarChart3, PieChart, FileSpreadsheet, Mail } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { exportToExcel } from '@/lib/excel-utils';
import { Branch, InventoryMovement, InventoryValorization } from '@/lib/dashboard-types';

type MovementFormData = {
  productId: string;
  branchId: string;
  type: 'IN' | 'OUT';
  quantity: string;
  unitCost: string;
};

export default function InventarioPage() {
  const [valorization, setValorization] = useState<InventoryValorization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isValModalOpen, setIsValModalOpen] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<MovementFormData>({
    productId: '',
    branchId: '',
    type: 'IN',
    quantity: '',
    unitCost: '',
  });

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements'],
    queryFn: async () => {
      const response = await api.inventory.getMovements();
      return response.data as InventoryMovement[];
    },
  });

  const branchesQuery = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: async () => {
      const response = await api.branches.findAll();
      return response.data as Branch[];
    },
  });

  const createMovementMutation = useMutation({
    mutationFn: (payload: { productId: string; branchId: string; type: string; quantity: number; unitCost: number }) =>
      api.inventory.create(payload),
  });

  const movements = movementsQuery.data ?? [];
  const branches = branchesQuery.data ?? [];
  const loading = movementsQuery.isLoading || branchesQuery.isLoading;
  const isSubmitting = createMovementMutation.isPending;

  useEffect(() => {
    if (movementsQuery.error instanceof Error) {
      showToast(movementsQuery.error.message || 'Error al cargar movimientos', 'error');
    }
  }, [movementsQuery.error, showToast]);

  useEffect(() => {
    if (branchesQuery.error instanceof Error) {
      showToast(branchesQuery.error.message || 'Error al cargar sedes', 'error');
    }
  }, [branchesQuery.error, showToast]);

  const loadValorization = async () => {
    try {
      const response = await api.reports.getInventoryValorization();
      if (response.success) {
        setValorization(response.data);
        setIsValModalOpen(true);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al calcular valorizacion', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchId || !formData.productId || !formData.quantity || !formData.unitCost) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    try {
      const response = await createMovementMutation.mutateAsync({
        ...formData,
        quantity: parseFloat(formData.quantity),
        unitCost: parseFloat(formData.unitCost),
      });

      if (response.success) {
        showToast('Movimiento registrado con exito', 'success');
        setIsModalOpen(false);
        setFormData({ productId: '', branchId: '', type: 'IN', quantity: '', unitCost: '' });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
        ]);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al registrar movimiento', 'error');
    }
  };

  const handleExportMovements = () => {
    if (movements.length === 0) {
      showToast('No hay datos para exportar', 'error');
      return;
    }

    const dataToExport = movements.map((m) => ({
      Fecha: new Date(m.createdAt).toLocaleString(),
      Producto: m.productId,
      Sede: m.branch?.name,
      Tipo: m.type === 'IN' ? 'Entrada' : 'Salida',
      Cantidad: Number(m.quantity),
      CostoUnit: Number(m.unitCost),
    }));

    exportToExcel(dataToExport, 'Movimientos_Inventario', 'Movimientos');
    showToast('Archivo Excel generado', 'success');
  };

  const handleExportValorization = () => {
    if (!valorization) return;

    const dataToExport = valorization.products.map((p) => ({
      Producto: p.productId,
      Stock: Number(p.stock),
      UltimoCosto: Number(p.latestCost),
      ValorTotal: Number(p.totalValue),
    }));

    exportToExcel(dataToExport, `Valorizacion_Inventario_${new Date().toISOString().split('T')[0]}`, 'Valorizacion');
    showToast('Reporte de valorizacion exportado a Excel', 'success');
  };

  const handleSendEmail = async () => {
    try {
      showToast('Enviando reporte por correo...', 'info');
      const response = await api.reports.sendEmailReport('inventory');
      if (response.success) {
        showToast('Reporte enviado a tu correo con exito', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al enviar correo', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-heading">Inventario</h1>
          <p className="text-gray-500">Monitoreo de movimientos de stock y valorizacion.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm w-fit"
          >
            <Mail className="w-5 h-5 text-[#7c3aed]" />
            Enviar Reporte
          </button>
          <button
            onClick={loadValorization}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm w-fit"
          >
            <BarChart3 className="w-5 h-5 text-gray-400" />
            Valorizacion
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-[#7c3aed]/20 w-fit"
          >
            <Plus className="w-5 h-5" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por producto..."
              className="pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl w-full focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all text-sm"
            />
          </div>
          <button
            onClick={handleExportMovements}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Fecha</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Producto</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Sede</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Tipo</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 text-right">Cant.</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 text-right">Costo Unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && movements.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8">
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : movements.length > 0 ? (
                movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(mov.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-black">{mov.productId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{mov.branch?.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          mov.type === 'IN' ? 'bg-blue-100 text-blue-700' : mov.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {mov.type === 'IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {mov.type === 'IN' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-black text-right">{Number(mov.quantity)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-black text-right">S/ {Number(mov.unitCost).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                    No hay movimientos de inventario registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isValModalOpen} onClose={() => setIsValModalOpen(false)} title="Reporte de Valorizacion de Inventario">
        {valorization && (
          <div className="space-y-8">
            <div className="p-8 bg-gradient-to-br from-purple-600 to-[#7c3aed] rounded-3xl text-white shadow-xl shadow-purple-200">
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <Coins className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Valor Total del Almacen</span>
              </div>
              <p className="text-4xl font-bold tracking-tight italic">S/ {Number(valorization.totalPortfolioValue).toFixed(2)}</p>
              <div className="mt-6 pt-6 border-t border-white/20 flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60 italic">
                <span>Calculo basado en ultimo costo de entrada</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <PieChart className="w-3 h-3" />
                Desglose por Producto
              </label>
              <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2">
                {valorization.products.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-purple-200 transition-all group">
                    <div>
                      <h4 className="font-bold text-black text-sm group-hover:text-[#7c3aed] transition-colors">{p.productId}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Stock: {p.stock} unidades</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-black italic">S/ {Number(p.totalValue).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 font-medium italic">u: S/ {Number(p.latestCost).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {valorization.products.length === 0 && <p className="text-center py-10 text-gray-400 text-xs italic">No hay productos en stock.</p>}
              </div>
            </div>

            <div className="pt-6 grid grid-cols-2 gap-3">
              <button className="py-4 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm italic flex items-center justify-center gap-2">
                Imprimir PDF
              </button>
              <button
                onClick={handleExportValorization}
                className="py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 italic flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                Excel
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Movimiento de Stock">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Producto (SKU o Nombre)</label>
            <input
              required
              type="text"
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              placeholder="Ej: PROD-001 o Laptop Pro"
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sede</label>
            <select
              required
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
            >
              <option value="">Selecciona una sede</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Tipo de Movimiento</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' })}
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
              >
                <option value="IN">Entrada (+)</option>
                <option value="OUT">Salida (-)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cantidad</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Costo Unitario</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              placeholder="0.00"
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-right"
            />
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-xl shadow-[#7c3aed]/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Movimiento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
