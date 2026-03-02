"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Save,
  Loader2,
  FileSpreadsheet,
  Mail,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { exportToExcel } from '@/lib/excel-utils';
import {
  Branch,
  InventoryMovement,
  PaginatedData,
  ProductOption,
} from '@/lib/dashboard-types';

type MovementFormData = {
  productId: string;
  branchId: string;
  type: 'IN' | 'OUT';
  quantity: string;
  unitCost: string;
};

export default function MovimientosPage() {
  const movementsPageSize = 10;
  const productsSelectorSize = 100;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementsPage, setMovementsPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<MovementFormData>({
    productId: '',
    branchId: '',
    type: 'IN',
    quantity: '',
    unitCost: '',
  });

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements', movementsPage, movementsPageSize],
    queryFn: async () => {
      const response = await api.inventory.getMovements({
        page: movementsPage,
        limit: movementsPageSize,
      });
      return response.data as PaginatedData<InventoryMovement>;
    },
  });

  const branchesQuery = useQuery({
    queryKey: ['branches', 'selector'],
    queryFn: async () => {
      const response = await api.branches.findAll({ page: 1, limit: 100 });
      return (response.data as PaginatedData<Branch>).items;
    },
  });

  const productsQuery = useQuery({
    queryKey: ['inventory', 'products', 'selector', formData.branchId],
    queryFn: async () => {
      const response = await api.inventory.listProducts(formData.branchId || undefined, {
        page: 1,
        limit: productsSelectorSize,
      });
      return (response.data as PaginatedData<ProductOption>).items;
    },
    enabled: !!formData.branchId,
  });

  const createMovementMutation = useMutation({
    mutationFn: (payload: {
      productId: string;
      branchId: string;
      type: 'IN' | 'OUT';
      quantity: number;
      unitCost: number;
    }) => api.inventory.create(payload),
  });

  const movements = useMemo(() => movementsQuery.data?.items ?? [], [movementsQuery.data]);
  const movementsPagination = movementsQuery.data?.meta;
  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const isSubmitting = createMovementMutation.isPending;
  const loading = movementsQuery.isLoading || branchesQuery.isLoading;

  const filteredMovements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return movements;

    return movements.filter((movement) => {
      const productCode = movement.productId.toLowerCase();
      const productName = (movement.product?.name ?? '').toLowerCase();
      const category = (movement.product?.category ?? '').toLowerCase();
      return (
        productCode.includes(term) ||
        productName.includes(term) ||
        category.includes(term)
      );
    });
  }, [movements, searchTerm]);

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

  useEffect(() => {
    if (productsQuery.error instanceof Error) {
      showToast(productsQuery.error.message || 'Error al cargar productos', 'error');
    }
  }, [productsQuery.error, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.branchId || !formData.productId || !formData.quantity || !formData.unitCost) {
      showToast('Completa todos los campos obligatorios', 'error');
      return;
    }

    try {
      const response = await createMovementMutation.mutateAsync({
        ...formData,
        quantity: Number(formData.quantity),
        unitCost: Number(formData.unitCost),
      });

      if (response.success) {
        showToast('Movimiento registrado con éxito', 'success');
        setIsModalOpen(false);
        setFormData({
          productId: '',
          branchId: '',
          type: 'IN',
          quantity: '',
          unitCost: '',
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
        ]);
        setMovementsPage(1);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al registrar movimiento', 'error');
    }
  };

  const handleExport = () => {
    if (filteredMovements.length === 0) {
      showToast('No hay movimientos para exportar', 'error');
      return;
    }

    const data = filteredMovements.map((movement) => ({
      Fecha: new Date(movement.createdAt).toLocaleString(),
      Código: movement.productId,
      Producto: movement.product?.name ?? movement.productId,
      Categoría: movement.product?.category ?? 'Sin categoría',
      Sede: movement.branch?.name ?? '-',
      Tipo: movement.type === 'IN' ? 'Entrada' : 'Salida',
      Cantidad: Number(movement.quantity),
      CostoUnitario: Number(movement.unitCost),
    }));

    exportToExcel(data, 'Movimientos_Recientes', 'Movimientos');
    showToast('Archivo Excel generado', 'success');
  };

  const handleSendEmail = async () => {
    try {
      showToast('Enviando reporte por correo...', 'info');
      const response = await api.reports.sendEmailReport('inventory');
      if (response.success) {
        showToast('Reporte enviado a tu correo con éxito', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al enviar correo', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-heading">Movimientos Recientes</h1>
          <p className="text-gray-500 dark:text-gray-400">Entradas y salidas de stock por sede.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 text-black dark:text-white rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm w-fit"
          >
            <Mail className="w-5 h-5 text-[#7c3aed]" />
            Enviar Reporte
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

      <div className="bg-white dark:bg-[#141414] rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-white/5 flex flex-col md:flex-row gap-4 justify-between bg-gray-50 dark:bg-[#1a1a1a]/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, producto o categoría..."
              className="pl-11 pr-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl w-full focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all text-sm text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-xl text-sm font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1a1a1a]/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Fecha</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Producto</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Categoría</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Sede</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Tipo</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5 text-right">Cant.</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5 text-right">Costo Unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading && filteredMovements.length === 0 ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredMovements.length > 0 ? (
                filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(movement.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-black dark:text-white">{movement.product?.name ?? movement.productId}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-semibold">{movement.productId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{movement.product?.category ?? 'Sin categoría'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{movement.branch?.name ?? '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          movement.type === 'IN'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {movement.type === 'IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {movement.type === 'IN' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-black dark:text-white text-right">{Number(movement.quantity)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-black dark:text-white text-right">S/ {Number(movement.unitCost).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400 dark:text-gray-500 italic">
                    No hay movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={movementsPagination}
          isLoading={movementsQuery.isFetching}
          onPageChange={setMovementsPage}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Movimiento de Stock">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Sede</label>
            <select
              required
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value, productId: '' })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white appearance-none"
            >
              <option value="">Selecciona una sede</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Producto</label>
            <select
              required
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.branchId || productsQuery.isLoading}
            >
              <option value="">{productsQuery.isLoading ? 'Cargando productos...' : 'Selecciona un producto'}</option>
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.name} ({product.productId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' })}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white appearance-none"
              >
                <option value="IN">Entrada (+)</option>
                <option value="OUT">Salida (-)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Cantidad</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Costo Unitario</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white"
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