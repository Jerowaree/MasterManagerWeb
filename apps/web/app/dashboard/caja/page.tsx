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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-heading">Caja</h1>
          <p className="text-gray-500 dark:text-gray-400">Registra ingresos y egresos de caja por sucursal.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 text-black dark:text-white rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm w-fit"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            Exportar Excel
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

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Sucursal:</span>
        {canSelectBranch ? (
          <select
            value={filterBranchId}
            onChange={(e) => {
              setFilterBranchId(e.target.value);
              setCashPage(1);
            }}
            className="px-4 py-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-black dark:text-white"
          >
            <option value="">Todas</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="px-4 py-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-black dark:text-white">
            {selectedBranchName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cashQuery.isLoading && cashMovements.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#141414] p-6 rounded-3xl border border-gray-200 dark:border-white/5 animate-pulse h-40" />
          ))
        ) : cashMovements.length > 0 ? (
          cashMovements.map((movement) => (
            <div key={movement.id} className="bg-white dark:bg-[#141414] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-3">
                {movement.type === 'IN' ? (
                  <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
                ) : (
                  <ArrowDownCircle className="w-6 h-6 text-rose-500" />
                )}
                <div>
                  <p className="text-sm font-bold text-black dark:text-white">
                    {movement.type === 'IN' ? 'Ingreso' : 'Egreso'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(movement.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-2xl font-bold text-black dark:text-white">S/ {Number(movement.amount).toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {movement.description || 'Sin descripción'}
                </p>
                {movement.reference && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ref: {movement.reference}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Sucursal: {movement.branch?.name ?? selectedBranchName}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white dark:bg-[#141414] p-20 rounded-3xl border border-gray-200 dark:border-white/5 border-dashed text-center">
            <ArrowUpCircle className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-500 italic font-medium">No hay movimientos de caja registrados.</p>
          </div>
        )}
      </div>

      <PaginationControls
        meta={cashPagination}
        isLoading={cashQuery.isFetching}
        onPageChange={setCashPage}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Movimiento de Caja">
        <form onSubmit={handleSubmit} className="space-y-6">
          {canSelectBranch && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Sucursal</label>
              <select
                required
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white"
              >
                <option value="">Selecciona una sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' })}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white"
              >
                <option value="IN">Ingreso</option>
                <option value="OUT">Egreso</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Monto</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Ej: 150.00"
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Descripción</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Pago de servicios"
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Referencia</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Ej: Boleta #123"
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-gray-500 dark:text-gray-400 font-bold hover:text-black dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}