"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, FileSpreadsheet, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { exportToExcel } from '@/lib/excel-utils';
import { Branch, CashMovement, PaginatedData } from '@/lib/dashboard-types';
import { useAuth } from '@/contexts/auth-context';

type CashFormData = {
  branchId: string;
  type: 'IN' | 'OUT';
  amount: string;
  description: string;
  reference: string;
};

export default function CajaPage() {
  const cashPageSize = 12;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cashPage, setCashPage] = useState(1);
  const [filterBranchId, setFilterBranchId] = useState(user?.branchId ?? '');
  const [formData, setFormData] = useState<CashFormData>({
    branchId: user?.branchId ?? '',
    type: 'IN',
    amount: '',
    description: '',
    reference: '',
  });

  useEffect(() => {
    if (user?.branchId && !formData.branchId) {
      setFormData((prev) => ({ ...prev, branchId: user.branchId ?? '' }));
      setFilterBranchId(user.branchId ?? '');
    }
  }, [user?.branchId, formData.branchId]);

  const branchesQuery = useQuery({
    queryKey: ['branches', 'selector'],
    queryFn: async () => {
      const response = await api.branches.findAll({ page: 1, limit: 100 });
      return (response.data as PaginatedData<Branch>).items;
    },
  });

  const cashQuery = useQuery({
    queryKey: ['cash', 'list', filterBranchId, cashPage, cashPageSize],
    queryFn: async () => {
      const response = await api.cash.findAll(
        filterBranchId || undefined,
        { page: cashPage, limit: cashPageSize },
      );
      return response.data as PaginatedData<CashMovement>;
    },
  });

  const createCashMutation = useMutation({
    mutationFn: (payload: {
      branchId: string;
      type: 'IN' | 'OUT';
      amount: number;
      description?: string;
      reference?: string;
    }) => api.cash.create(payload),
  });

  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);
  const cashMovements = cashQuery.data?.items ?? [];
  const cashPagination = cashQuery.data?.meta;
  const isSubmitting = createCashMutation.isPending;

  const canSelectBranch = !user?.branchId;

  const selectedBranchName = useMemo(() => {
    if (!filterBranchId) return 'Todas las sucursales';
    return branches.find((b) => b.id === filterBranchId)?.name ?? 'Sucursal';
  }, [branches, filterBranchId]);

  useEffect(() => {
    if (branchesQuery.error instanceof Error) {
      showToast(branchesQuery.error.message || 'Error al cargar sucursales', 'error');
    }
  }, [branchesQuery.error, showToast]);

  useEffect(() => {
    if (cashQuery.error instanceof Error) {
      showToast(cashQuery.error.message || 'Error al cargar caja', 'error');
    }
  }, [cashQuery.error, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchId || !formData.amount) {
      showToast('Completa los campos obligatorios', 'error');
      return;
    }

    try {
      const response = await createCashMutation.mutateAsync({
        branchId: formData.branchId,
        type: formData.type,
        amount: Number(formData.amount),
        description: formData.description || undefined,
        reference: formData.reference || undefined,
      });

      if (response.success) {
        showToast('Movimiento de caja registrado', 'success');
        setIsModalOpen(false);
        setFormData({
          branchId: user?.branchId ?? '',
          type: 'IN',
          amount: '',
          description: '',
          reference: '',
        });
        await queryClient.invalidateQueries({ queryKey: ['cash', 'list'] });
        setCashPage(1);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al registrar movimiento', 'error');
    }
  };

  const handleExport = () => {
    if (cashMovements.length === 0) {
      showToast('No hay movimientos para exportar', 'error');
      return;
    }

    const data = cashMovements.map((movement) => ({
      Fecha: new Date(movement.createdAt).toLocaleString(),
      Tipo: movement.type === 'IN' ? 'Ingreso' : 'Egreso',
      Monto: Number(movement.amount),
      Descripcion: movement.description || 'N/A',
      Referencia: movement.reference || 'N/A',
      Sucursal: movement.branch?.name ?? selectedBranchName,
    }));

    exportToExcel(data, 'Movimientos_Caja', 'Caja');
    showToast('Archivo Excel generado', 'success');
  };

  return (
    <div className="space-y-8 relative z-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-heading tracking-tight">Caja</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Registra ingresos y egresos de caja por sucursal.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white dark:backdrop-blur-md rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm w-fit"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            Exportar Excel
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 dark:bg-purple-600 text-white rounded-2xl font-bold hover:bg-violet-700 dark:hover:bg-purple-700 transition-all shadow-lg shadow-violet-600/20 active:scale-95 w-fit"
          >
            <Plus className="w-5 h-5" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Sucursal:</span>
        {canSelectBranch ? (
          <select
            value={filterBranchId}
            onChange={(e) => {
              setFilterBranchId(e.target.value);
              setCashPage(1);
            }}
            className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm"
          >
            <option value="" className="dark:bg-[#0f0a1e]">Todas</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id} className="dark:bg-[#0f0a1e]">
                {branch.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-900 dark:text-white shadow-sm">
            {selectedBranchName}
          </span>
        )}
      </div>

      {/* TARJETAS DE MOVIMIENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cashQuery.isLoading && cashMovements.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10 dark:backdrop-blur-xl shadow-sm animate-pulse h-40" />
          ))
        ) : cashMovements.length > 0 ? (
          cashMovements.map((movement) => (
            <div key={movement.id} className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10 dark:backdrop-blur-xl shadow-sm hover:border-violet-300 dark:hover:border-purple-500/30 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-transparent group-hover:from-violet-50/50 dark:group-hover:from-purple-500/5 transition-all duration-500 pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                {movement.type === 'IN' ? (
                  <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
                ) : (
                  <ArrowDownCircle className="w-6 h-6 text-rose-500" />
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {movement.type === 'IN' ? 'Ingreso' : 'Egreso'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(movement.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 relative z-10">
                <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">S/ {Number(movement.amount).toFixed(2)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
                  {movement.description || 'Sin descripción'}
                </p>
                {movement.reference && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Ref: {movement.reference}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 font-semibold uppercase tracking-wider">Sucursal: {movement.branch?.name ?? selectedBranchName}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white dark:bg-white/5 dark:backdrop-blur-xl p-20 rounded-3xl border border-gray-200 dark:border-white/10 border-dashed text-center shadow-sm">
            <ArrowUpCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 italic font-medium">No hay movimientos de caja registrados.</p>
          </div>
        )}
      </div>

      <PaginationControls
        meta={cashPagination}
        isLoading={cashQuery.isFetching}
        onPageChange={setCashPage}
      />

      {/* MODAL CON FORMULARIO PULIDO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Movimiento de Caja">
        <form onSubmit={handleSubmit} className="space-y-5">
          {canSelectBranch && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Sucursal</label>
              <select
                required
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 dark:focus:ring-purple-500/20 dark:focus:border-purple-500 outline-none transition-all font-medium text-sm text-gray-900 dark:text-white shadow-sm hover:border-gray-300 dark:hover:border-white/20 appearance-none"
              >
                <option value="" className="dark:bg-[#0f0a1e]">Selecciona una sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id} className="dark:bg-[#0f0a1e]">
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' })}
                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 dark:focus:ring-purple-500/20 dark:focus:border-purple-500 outline-none transition-all font-medium text-sm text-gray-900 dark:text-white shadow-sm hover:border-gray-300 dark:hover:border-white/20 appearance-none"
              >
                <option value="IN" className="dark:bg-[#0f0a1e]">Ingreso</option>
                <option value="OUT" className="dark:bg-[#0f0a1e]">Egreso</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">S/</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 dark:focus:ring-purple-500/20 dark:focus:border-purple-500 outline-none transition-all font-medium text-sm text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm hover:border-gray-300 dark:hover:border-white/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Descripción</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Pago de servicios eléctricos"
              className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 dark:focus:ring-purple-500/20 dark:focus:border-purple-500 outline-none transition-all font-medium text-sm text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm hover:border-gray-300 dark:hover:border-white/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Referencia</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Ej: Boleta #123-A"
              className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 dark:focus:ring-purple-500/20 dark:focus:border-purple-500 outline-none transition-all font-medium text-sm text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm hover:border-gray-300 dark:hover:border-white/20"
            />
          </div>

          {/* Botones del Formulario */}
          <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm bg-violet-600 dark:bg-purple-600 text-white rounded-xl font-semibold hover:bg-violet-700 dark:hover:bg-purple-700 transition-all shadow-md shadow-violet-600/20 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}