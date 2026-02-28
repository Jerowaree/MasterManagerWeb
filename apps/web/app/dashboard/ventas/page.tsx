"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Filter, Loader2, Save, Calculator, Calendar, ReceiptText, FileSpreadsheet, Mail, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { exportToExcel } from '@/lib/excel-utils';
import { Branch, CashClosing, Customer, PaginatedData, ProductOption, Sale } from '@/lib/dashboard-types';

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
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data]);
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
        showToast('Venta registrada con exito', 'success');
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
      Cliente: s.customer?.name || 'Venta Rapida',
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
      Cliente: s.customer?.name || 'Venta Rapida',
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
      if (response.success) showToast('Reporte enviado a tu correo con exito', 'success');
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-heading">Ventas</h1>
          <p className="text-gray-500">Gestiona y visualiza todas las transacciones de tus sedes.</p>
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
            onClick={loadCashClosing}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm w-fit"
          >
            <Calculator className="w-5 h-5 text-gray-400" />
            Cierre de Caja
          </button>
          <button
            onClick={() => {
              setFormError('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-[#7c3aed]/20 w-fit"
          >
            <Plus className="w-5 h-5" />
            Nueva Venta
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o ID..."
              className="pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl w-full focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportSales}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Exportar
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">ID</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Cliente</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Sede</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Fecha</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Total</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && sales.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8">
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-400">#{sale.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-black">{sale.customer?.name || 'Venta Rapida'}</div>
                      <div className="text-xs text-gray-400">{sale.customer?.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{sale.branch?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-sm text-black">S/ {Number(sale.total).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          sale.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {sale.status === 'paid' ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                    No hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          meta={salesPagination}
          isLoading={salesQuery.isFetching}
          onPageChange={setSalesPage}
        />
      </div>

      <Modal isOpen={isCashModalOpen} onClose={() => setIsCashModalOpen(false)} title="Resumen de Cierre de Caja">
        {cashClosing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#7c3aed]" />
                <span className="font-bold text-black italic">Fecha del reporte:</span>
              </div>
              <span className="text-sm font-black text-[#7c3aed] uppercase tracking-widest">
                {new Date(cashClosing.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Ventas</p>
                <p className="text-2xl font-bold text-black italic">S/ {Number(cashClosing.totalAmount).toFixed(2)}</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Operaciones</p>
                <p className="text-2xl font-bold text-black italic">{cashClosing.count}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <ReceiptText className="w-3 h-3" />
                Detalle de Operaciones de Hoy
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {cashClosing.sales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-purple-200 transition-all">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-black">{s.customer?.name || 'Venta Rapida'}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase">{s.branch?.name}</span>
                    </div>
                    <span className="text-sm font-black text-black italic">S/ {Number(s.total).toFixed(2)}</span>
                  </div>
                ))}
                {cashClosing.sales.length === 0 && <p className="text-center py-10 text-gray-400 text-xs italic">Sin movimientos hoy.</p>}
              </div>
            </div>

            <div className="pt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => window.print()}
                className="py-4 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm italic flex items-center justify-center gap-2"
              >
                Imprimir Reporte Z
              </button>
              <button
                onClick={handleExportCashClosing}
                className="py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 italic flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                Excel
              </button>
            </div>
          </div>
        )}
      </Modal>

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
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cliente (Opcional)</label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
            >
              <option value="">Venta Rapida (Sin Cliente)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sede</label>
            <select
              required
              value={formData.branchId}
              onChange={(e) => handleBranchChange(e.target.value)}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Productos</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    required
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    className="col-span-5 px-3 py-3 bg-gray-50 border-gray-100 rounded-2xl text-sm font-bold outline-none"
                    disabled={!formData.branchId || loadingProducts}
                  >
                    <option value="">{loadingProducts ? 'Cargando productos...' : 'Selecciona producto'}</option>
                    {products.map((p) => (
                      <option key={`${p.branchId}-${p.productId}`} value={p.productId}>
                        {p.name} [{p.category}] (Stock: {p.quantity}, Precio: S/ {Number(p.price).toFixed(2)})
                      </option>
                    ))}
                  </select>

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="col-span-3 px-3 py-3 bg-gray-50 border-gray-100 rounded-2xl text-sm text-right font-bold outline-none"
                    placeholder="Cant."
                  />

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.unitPrice}
                    readOnly
                    className="col-span-3 px-3 py-3 bg-gray-50 border-gray-100 rounded-2xl text-sm text-right font-bold outline-none"
                    placeholder="Precio"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={formData.items.length === 1}
                    className="col-span-1 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>

            {formData.branchId && products.length === 0 && !loadingProducts && (
              <p className="text-xs text-orange-600 font-semibold">
                No hay productos con stock en esta sede. Crea entradas en Inventario primero.
              </p>
            )}

            {(stockExceededMessage || formError) && (
              <p className="text-xs font-semibold text-red-600">{stockExceededMessage || formError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'paid' | 'pending' })}
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
              >
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Total calculado (S/)</label>
              <input
                readOnly
                value={computedTotal.toFixed(2)}
                className="w-full px-5 py-3 bg-gray-100 border-gray-100 rounded-2xl font-bold text-sm text-right"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || loadingProducts || !!stockExceededMessage}
              className="flex items-center gap-2 px-8 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-xl shadow-[#7c3aed]/20 disabled:opacity-50"
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
