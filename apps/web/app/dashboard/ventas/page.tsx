"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Save,
  Calculator,
  Calendar,
  ReceiptText,
  FileSpreadsheet,
  Mail,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { exportToExcel } from '@/lib/excel-utils';
import {
  Branch,
  CashClosing,
  Customer,
  PaginatedData,
  ProductOption,
  Sale,
} from '@/lib/dashboard-types';

type SaleItemForm = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

type SaleFormData = {
  customerId: string;
  branchId: string;
  status: 'paid' | 'pending';
  items: SaleItemForm[];
};

const initialSaleItems: SaleItemForm[] = [{ productId: '', quantity: '1', unitPrice: '' }];

export default function VentasPage() {
  const salesPageSize = 10;
  const [cashClosing, setCashClosing] = useState<CashClosing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<SaleFormData>({
    customerId: '',
    branchId: '',
    status: 'paid',
    items: initialSaleItems,
  });

  const salesQuery = useQuery({
    queryKey: ['sales', 'list', salesPage, salesPageSize],
    queryFn: async () => {
      const response = await api.sales.findAll({ page: salesPage, limit: salesPageSize });
      return response.data as PaginatedData<Sale>;
    },
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'selector'],
    queryFn: async () => {
      const response = await api.customers.findAll({ page: 1, limit: 100 });
      return (response.data as PaginatedData<Customer>).items;
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
    queryKey: ['inventory', 'products', formData.branchId],
    queryFn: async () => {
      const response = await api.inventory.listProducts(formData.branchId, { page: 1, limit: 100 });
      return (response.data as PaginatedData<ProductOption>).items.filter((item) => Number(item.quantity) > 0);
    },
    enabled: !!formData.branchId,
  });

  const createSaleMutation = useMutation({
    mutationFn: (payload: {
      customerId: string | null;
      branchId: string;
      status: string;
      total: number;
      items: Array<{ productId: string; quantity: number; unitPrice: number }>;
      idempotencyKey: string;
    }) =>
      api.sales.create(
        {
          customerId: payload.customerId,
          branchId: payload.branchId,
          status: payload.status,
          total: payload.total,
          items: payload.items,
        },
        payload.idempotencyKey
      ),
  });

  const sales = salesQuery.data?.items ?? [];
  const salesPagination = salesQuery.data?.meta;
  const customers = customersQuery.data ?? [];
  const branches = branchesQuery.data ?? [];
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const loading = salesQuery.isLoading || customersQuery.isLoading || branchesQuery.isLoading;
  const loadingProducts = productsQuery.isLoading;

  const loadCashClosing = async () => {
    try {
      const response = await api.reports.getCashClosing();
      if (response.success) {
        setCashClosing(response.data);
        setIsCashModalOpen(true);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al generar cierre de caja', 'error');
    }
  };

  const handleAddItem = () => {
    setFormError('');
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: '1', unitPrice: '' }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormError('');
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, key: keyof SaleItemForm, value: string) => {
    setFormError('');
    setFormData((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== index) return item;

        if (key === 'productId') {
          const selectedProduct = products.find((product) => product.productId === value);
          return {
            ...item,
            productId: value,
            unitPrice: selectedProduct ? String(selectedProduct.price) : '',
          };
        }

        return { ...item, [key]: value };
      });

      return { ...prev, items };
    });
  };

  const handleBranchChange = (branchId: string) => {
    setFormError('');
    setFormData((prev) => ({
      ...prev,
      branchId,
      items: prev.items.map((item) => ({ ...item, productId: '' })),
    }));
  };

  const computedTotal = useMemo(
    () =>
      formData.items.reduce((acc, item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return acc;
        return acc + quantity * unitPrice;
      }, 0),
    [formData.items]
  );

  const stockExceededMessage = useMemo(() => {
    for (const item of formData.items) {
      if (!item.productId) continue;
      const requested = Number(item.quantity);
      const product = products.find((p) => p.productId === item.productId);

      if (!product || !Number.isFinite(requested) || requested <= 0) continue;
      if (requested > Number(product.quantity)) {
        return `La cantidad de ${product.name} (${item.productId}) excede el stock disponible (${Number(product.quantity)}).`;
      }
    }

    return '';
  }, [formData.items, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.branchId) {
      showToast('Selecciona una sede', 'error');
      return;
    }

    if (formData.items.length === 0) {
      showToast('Debes agregar al menos un producto', 'error');
      return;
    }

    const parsedItems = formData.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    if (
      parsedItems.some(
        (item) =>
          !item.productId ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice <= 0
      )
    ) {
      showToast('Completa correctamente producto, cantidad y precio unitario', 'error');
      return;
    }

    if (stockExceededMessage) {
      setFormError(stockExceededMessage);
      return;
    }

    try {
      const response = await createSaleMutation.mutateAsync({
        customerId: formData.customerId || null,
        branchId: formData.branchId,
        status: formData.status,
        total: computedTotal,
        items: parsedItems,
        idempotencyKey: `sale-${Date.now()}-${crypto.randomUUID()}`,
      });

      if (response.success) {
        showToast('Venta registrada con éxito', 'success');
        setIsModalOpen(false);
        setFormError('');
        setFormData({
          customerId: '',
          branchId: '',
          status: 'paid',
          items: initialSaleItems,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['sales', 'list'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
        ]);
        setSalesPage(1);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar venta');
    }
  };

  const isSubmitting = createSaleMutation.isPending;

  const handleExportSales = () => {
    if (sales.length === 0) {
      showToast('No hay datos para exportar', 'error');
      return;
    }

    const dataToExport = sales.map((s) => ({
      ID: s.id.slice(0, 8),
      Cliente: s.customer?.name || 'Venta Rápida',
      Sede: s.branch?.name,
      Fecha: new Date(s.createdAt).toLocaleDateString(),
      Total: Number(s.total),
      Estado: s.status === 'paid' ? 'Completado' : 'Pendiente',
    }));

    exportToExcel(dataToExport, 'Reporte_Ventas', 'Ventas');
    showToast('Archivo Excel generado', 'success');
  };

  const handleExportCashClosing = () => {
    if (!cashClosing) return;

    const dataToExport = cashClosing.sales.map((s) => ({
      ID: s.id.slice(0, 8),
      Cliente: s.customer?.name || 'Venta Rápida',
      Sede: s.branch?.name,
      Moneda: 'PEN',
      Total: Number(s.total),
      Fecha: new Date(s.createdAt).toLocaleString(),
    }));

    exportToExcel(dataToExport, `Cierre_Caja_${new Date().toISOString().split('T')[0]}`, 'Cierre de Caja');
    showToast('Cierre de caja exportado a Excel', 'success');
  };

  const handleSendEmail = async () => {
    try {
      showToast('Enviando reporte por correo...', 'info');
      const response = await api.reports.sendEmailReport('sales');
      if (response.success) showToast('Reporte enviado a tu correo con éxito', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al enviar correo', 'error');
    }
  };

  useEffect(() => {
    if (salesQuery.error instanceof Error) {
      showToast(salesQuery.error.message || 'Error al cargar ventas', 'error');
    }
  }, [salesQuery.error, showToast]);

  useEffect(() => {
    if (customersQuery.error instanceof Error) {
      showToast(customersQuery.error.message || 'Error al cargar clientes', 'error');
    }
  }, [customersQuery.error, showToast]);

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

  return (
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER REESTRUCTURADO PARA MÓVILES */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between w-full gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight truncate">
            Ventas
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
              onClick={loadCashClosing}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-4 md:py-2.5 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-sm shrink-0"
            >
              <Calculator className="w-4 h-4 text-gray-400" />
              <span className="hidden md:inline">Cierre de Caja</span>
            </button>
            <button
              onClick={() => {
                setFormError('');
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-3.5 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] text-sm md:text-base shrink-0"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Nueva venta</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </div>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Gestiona y visualiza todas las transacciones de tus sedes.
        </p>
      </div>

      {/* BUSCADOR Y EXPORTAR */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o ID..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-medium text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportSales}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Exportar</span>
          </button>
          <button className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm">
            <Filter className="w-4 h-4 text-gray-400" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[800px] text-sm text-left border-collapse table-fixed">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">ID</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[25%]">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[20%]">Sede</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[15%]">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-center w-[10%]">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading && sales.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td colSpan={6} className="px-6 py-5">
                      <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      #{sale.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800 dark:text-white truncate">{sale.customer?.name || 'Venta Rápida'}</p>
                      <p className="text-xs font-medium text-gray-400 truncate mt-0.5">{sale.customer?.email || 'Sin email'}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium truncate">
                      {sale.branch?.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white text-right whitespace-nowrap">
                      S/ {Number(sale.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                          sale.status === 'paid'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                            : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20'
                        }`}
                      >
                        {sale.status === 'paid' ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 italic">
                    No hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* PAGINACIÓN */}
      <div className="flex justify-center w-full mt-2">
        <PaginationControls
          meta={salesPagination}
          isLoading={salesQuery.isFetching}
          onPageChange={setSalesPage}
        />
      </div>

      {/* MODAL: CIERRE DE CAJA */}
      <Modal isOpen={isCashModalOpen} onClose={() => setIsCashModalOpen(false)} title="Resumen de Cierre de Caja">
        {cashClosing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 md:p-5 bg-violet-50/50 dark:bg-purple-500/10 rounded-2xl border border-violet-100 dark:border-purple-500/20 shadow-sm">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-violet-600 dark:text-purple-400" />
                <span className="font-semibold text-gray-800 dark:text-white">Fecha del reporte:</span>
              </div>
              <span className="text-sm font-bold text-violet-600 dark:text-purple-300 uppercase tracking-widest">
                {new Date(cashClosing.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50 dark:bg-white/5 dark:backdrop-blur-md rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Ventas</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">S/ {Number(cashClosing.totalAmount).toFixed(2)}</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-white/5 dark:backdrop-blur-md rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Operaciones</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">{cashClosing.count}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <ReceiptText className="w-3.5 h-3.5" />
                Detalle de Operaciones de Hoy
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {cashClosing.sales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl hover:border-violet-200 dark:hover:border-purple-500/30 transition-all shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">{s.customer?.name || 'Venta Rápida'}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{s.branch?.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800 dark:text-white">S/ {Number(s.total).toFixed(2)}</span>
                  </div>
                ))}
                {cashClosing.sales.length === 0 && <p className="text-center py-10 text-gray-400 text-xs italic">Sin movimientos hoy.</p>}
              </div>
            </div>

            <div className="pt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => window.print()}
                className="py-3.5 md:py-4 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-white rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Imprimir Reporte
              </button>
              <button
                onClick={handleExportCashClosing}
                className="py-3.5 md:py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-black/5 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                Exportar Excel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: REGISTRAR VENTA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setFormError('');
          setIsModalOpen(false);
        }}
        title="Registrar Nueva Venta"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cliente (Opcional)</label>
            <div className="relative group">
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              >
                <option value="" className="dark:bg-gray-900">Venta Rápida (Sin Cliente)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-gray-900">
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sede</label>
            <div className="relative group">
              <select
                required
                value={formData.branchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              >
                <option value="" className="dark:bg-gray-900">Selecciona una sede</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-gray-900">
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Productos</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-purple-500/10 hover:bg-violet-100 dark:hover:bg-purple-500/20 text-violet-600 dark:text-purple-300 transition-colors"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5 relative group">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className="w-full px-3 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                      disabled={!formData.branchId || loadingProducts}
                    >
                      <option value="" className="dark:bg-gray-900">{loadingProducts ? 'Cargando...' : 'Producto'}</option>
                      {products.map((p) => (
                        <option key={`${p.branchId}-${p.productId}`} value={p.productId} className="dark:bg-gray-900">
                          {p.name} (Stock: {p.quantity})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
                  </div>

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="col-span-3 px-3 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm text-right font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                    placeholder="Cant."
                  />

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.unitPrice}
                    readOnly
                    className="col-span-3 px-3 py-3 bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-sm text-right font-medium text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed opacity-70"
                    placeholder="Precio"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={formData.items.length === 1}
                    className="col-span-1 h-11 flex items-center justify-center rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {formData.branchId && products.length === 0 && !loadingProducts && (
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                No hay productos con stock en esta sede.
              </p>
            )}

            {(stockExceededMessage || formError) && (
              <p className="text-xs font-medium text-rose-500 dark:text-rose-400">{stockExceededMessage || formError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estado</label>
              <div className="relative group">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'paid' | 'pending' })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="paid" className="dark:bg-gray-900">Pagado</option>
                  <option value="pending" className="dark:bg-gray-900">Pendiente</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total calculado (S/)</label>
              <input
                readOnly
                value={computedTotal.toFixed(2)}
                className="w-full px-4 py-3 bg-gray-100/80 dark:bg-white/10 border border-gray-200/50 dark:border-transparent rounded-2xl font-bold text-sm text-right text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || loadingProducts || !!stockExceededMessage}
              className="flex items-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Finalizar Venta
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}