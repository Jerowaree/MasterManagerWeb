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
  ChevronDown,
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

// Tipo para asegurar que las respuestas de la API sean reconocidas por TypeScript
type ApiResponse = {
  success: boolean;
  data?: any;
  message?: string;
};

export default function HistorialPage() {
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
    mutationFn: async (payload: {
      productId: string;
      branchId: string;
      type: 'IN' | 'OUT';
      quantity: number;
      unitCost: number;
    }) => {
      const res = await api.inventory.create(payload);
      return res as ApiResponse;
    },
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

    return movements.filter((movement: InventoryMovement) => {
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

    const data = filteredMovements.map((movement: InventoryMovement) => ({
      Fecha: new Date(movement.createdAt).toLocaleString(),
      Código: movement.productId,
      Producto: movement.product?.name ?? movement.productId,
      Categoría: movement.product?.category ?? 'Sin categoría',
      Sede: movement.branch?.name ?? '-',
      Tipo: movement.type === 'IN' ? 'Entrada' : 'Salida',
      Cantidad: Number(movement.quantity),
      CostoUnitario: Number(movement.unitCost),
    }));

    exportToExcel(data, 'Historial_Movimientos', 'Historial');
    showToast('Archivo Excel generado', 'success');
  };

  const handleSendEmail = async () => {
    try {
      showToast('Enviando reporte por correo...', 'info');
      const response = (await api.reports.sendEmailReport('inventory')) as ApiResponse;
      if (response.success) {
        showToast('Reporte enviado a tu correo con éxito', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al enviar correo', 'error');
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER REESTRUCTURADO */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between w-full gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight truncate">
            Historial
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              className="hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-sm"
            >
              <Mail className="w-4 h-4 text-violet-500" />
              <span>Reporte</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-3.5 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] text-sm md:text-base shrink-0"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Nuevo movimiento</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Entradas y salidas de stock por sede.
        </p>
      </div>

      {/* BUSCADOR Y EXPORTAR */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, producto o categoría..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-medium text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm w-full sm:w-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* TABLA PRINCIPAL CORREGIDA */}
      <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[800px] text-sm text-left border-collapse table-fixed">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[25%]">Producto</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Sede</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[10%]">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[10%]">Cant.</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[10%]">Costo Unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading && filteredMovements.length === 0 ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td colSpan={7} className="px-6 py-5">
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full animate-pulse w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredMovements.length > 0 ? (
                filteredMovements.map((movement: InventoryMovement) => (
                  <tr key={movement.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(movement.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800 dark:text-white truncate">{movement.product?.name ?? movement.productId}</p>
                      <p className="text-xs font-medium text-gray-400 truncate mt-0.5">{movement.productId}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate">
                      {movement.product?.category ?? 'Sin categoría'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium truncate">
                      {movement.branch?.name ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                          movement.type === 'IN'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-rose-50 text-rose-600 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        }`}
                      >
                        {movement.type === 'IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {movement.type === 'IN' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white text-right">
                      {Number(movement.quantity)}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white text-right">
                      S/ {Number(movement.unitCost).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic">
                    No hay movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center w-full mt-2">
        <PaginationControls
          meta={movementsPagination}
          isLoading={movementsQuery.isFetching}
          onPageChange={setMovementsPage}
        />
      </div>

      {/* MODAL: NUEVO MOVIMIENTO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Movimiento de Stock">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sede</label>
            <div className="relative group">
              <select
                required
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value, productId: '' })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              >
                <option value="" className="dark:bg-gray-900">Selecciona una sede</option>
                {branches.map((branch: Branch) => (
                  <option key={branch.id} value={branch.id} className="dark:bg-gray-900">
                    {branch.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Producto</label>
            <div className="relative group">
              <select
                required
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                disabled={!formData.branchId || productsQuery.isLoading}
              >
                <option value="" className="dark:bg-gray-900">{productsQuery.isLoading ? 'Cargando productos...' : 'Selecciona un producto'}</option>
                {products.map((product: ProductOption) => (
                  <option key={product.productId} value={product.productId} className="dark:bg-gray-900">
                    {product.name} ({product.productId})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de Movimiento</label>
              <div className="relative group">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="IN" className="dark:bg-gray-900">Entrada (+)</option>
                  <option value="OUT" className="dark:bg-gray-900">Salida (-)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cantidad</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Costo Unitario (S/)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
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