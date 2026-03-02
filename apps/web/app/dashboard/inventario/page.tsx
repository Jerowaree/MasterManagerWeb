"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Save,
  Pencil,
  AlertTriangle,
  Boxes,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  ArrowRightLeft,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { exportToExcel, parseInventoryExcel } from '@/lib/excel-utils';
import {
  Branch,
  InventoryValorization,
  LowStockProduct,
  PaginatedData,
  ProductOption,
} from '@/lib/dashboard-types';

type ProductFormData = {
  productId: string;
  name: string;
  category: string;
  price: string;
  minStock: string;
  branchId: string;
  initialStock: string;
  initialCost: string;
};

type ProductEditFormData = {
  productId: string;
  name: string;
  category: string;
  price: string;
  minStock: string;
};

type ProductStockFormData = {
  productId: string;
  branchId: string;
  currentQuantity: string;
  targetQuantity: string;
  unitCost: string;
};

export default function InventarioPage() {
  const productsPageSize = 10;

  const [productsPage, setProductsPage] = useState(1);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [valorization, setValorization] = useState<InventoryValorization | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isValModalOpen, setIsValModalOpen] = useState(false);
  const [isImportHelpOpen, setIsImportHelpOpen] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    productId: '',
    name: '',
    category: '',
    price: '',
    minStock: '',
    branchId: '',
    initialStock: '',
    initialCost: '',
  });
  const [editFormData, setEditFormData] = useState<ProductEditFormData>({
    productId: '',
    name: '',
    category: '',
    price: '',
    minStock: '',
  });
  const [stockFormData, setStockFormData] = useState<ProductStockFormData>({
    productId: '',
    branchId: '',
    currentQuantity: '0',
    targetQuantity: '0',
    unitCost: '',
  });
  const lowStockAlertRef = useRef(0);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['inventory', 'products', selectedBranchId, productsPage, productsPageSize],
    queryFn: async () => {
      const response = await api.inventory.listProducts(selectedBranchId || undefined, {
        page: productsPage,
        limit: productsPageSize,
      });
      return response.data as PaginatedData<ProductOption>;
    },
  });

  const branchesQuery = useQuery({
    queryKey: ['branches', 'selector'],
    queryFn: async () => {
      const response = await api.branches.findAll({ page: 1, limit: 100 });
      return (response.data as PaginatedData<Branch>).items;
    },
  });
  const lowStockQuery = useQuery({
    queryKey: ['inventory', 'low-stock', selectedBranchId],
    queryFn: async () => {
      const response = await api.inventory.getLowStock(selectedBranchId || undefined, {
        page: 1,
        limit: 5,
      });
      return response.data as PaginatedData<LowStockProduct>;
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (payload: {
      productId: string;
      name: string;
      category: string;
      price: number;
      minStock: number;
      branchId?: string;
      initialStock?: number;
      initialCost?: number;
    }) => api.inventory.createProduct(payload),
  });
  const updateProductMutation = useMutation({
    mutationFn: (payload: {
      productId: string;
      name: string;
      category: string;
      price: number;
      minStock: number;
    }) =>
      api.inventory.updateProduct(payload.productId, {
        name: payload.name,
        category: payload.category,
        price: payload.price,
        minStock: payload.minStock,
      }),
  });
  const adjustStockMutation = useMutation({
    mutationFn: (payload: {
      productId: string;
      branchId: string;
      quantity: number;
      unitCost?: number;
    }) =>
      api.inventory.adjustProductStock(payload.productId, {
        branchId: payload.branchId,
        quantity: payload.quantity,
        unitCost: payload.unitCost,
      }),
  });

  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data]);
  const productsPagination = productsQuery.data?.meta;
  const lowStockItems = useMemo(() => lowStockQuery.data?.items ?? [], [lowStockQuery.data]);
  const lowStockTotal = lowStockQuery.data?.meta.total ?? 0;
  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);
  const loading = productsQuery.isLoading || branchesQuery.isLoading || lowStockQuery.isLoading;
  const isSubmitting = createProductMutation.isPending;
  const isUpdating = updateProductMutation.isPending;
  const isAdjustingStock = adjustStockMutation.isPending;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      return (
        product.productId.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    });
  }, [products, searchTerm]);

  useEffect(() => {
    if (productsQuery.error instanceof Error) {
      showToast(productsQuery.error.message || 'Error al cargar productos', 'error');
    }
  }, [productsQuery.error, showToast]);

  useEffect(() => {
    if (branchesQuery.error instanceof Error) {
      showToast(branchesQuery.error.message || 'Error al cargar sedes', 'error');
    }
  }, [branchesQuery.error, showToast]);

  useEffect(() => {
    if (lowStockQuery.error instanceof Error) {
      showToast(lowStockQuery.error.message || 'Error al cargar alertas de stock bajo', 'error');
    }
  }, [lowStockQuery.error, showToast]);

  useEffect(() => {
    if (lowStockTotal === 0) {
      lowStockAlertRef.current = 0;
      return;
    }

    if (lowStockAlertRef.current !== lowStockTotal) {
      lowStockAlertRef.current = lowStockTotal;
      showToast(`Alerta: ${lowStockTotal} producto(s) en stock bajo`, 'error');
    }
  }, [lowStockTotal, showToast]);

  const loadValorization = async () => {
    try {
      const response = await api.reports.getInventoryValorization();
      if (response.success) {
        setValorization(response.data as InventoryValorization);
        setIsValModalOpen(true);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al calcular valorización', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const initialStock = Number(formData.initialStock || 0);
    const payload: {
      productId: string;
      name: string;
      category: string;
      price: number;
      minStock: number;
      branchId?: string;
      initialStock?: number;
      initialCost?: number;
    } = {
      productId: formData.productId,
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      minStock: Number(formData.minStock || 0),
    };

    if (initialStock > 0) {
      if (!formData.branchId) {
        showToast('Selecciona una sede para registrar stock inicial', 'error');
        return;
      }
      if (!formData.initialCost) {
        showToast('Ingresa el costo inicial para el stock registrado', 'error');
        return;
      }
      payload.branchId = formData.branchId;
      payload.initialStock = initialStock;
      payload.initialCost = Number(formData.initialCost);
    }

    try {
      const response = await createProductMutation.mutateAsync(payload);
      if (response.success) {
        showToast('Producto creado correctamente', 'success');
        setFormData({
          productId: '',
          name: '',
          category: '',
          price: '',
          minStock: '',
          branchId: '',
          initialStock: '',
          initialCost: '',
        });
        setIsProductModalOpen(false);
        setProductsPage(1);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] }),
        ]);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al crear producto', 'error');
    }
  };

  const handleExportProducts = () => {
    if (filteredProducts.length === 0) {
      showToast('No hay productos para exportar', 'error');
      return;
    }

    const rows = filteredProducts.map((product) => ({
      Código: product.productId,
      Nombre: product.name,
      Categoría: product.category,
      Precio: Number(product.price).toFixed(2),
      Stock: Number(product.quantity),
      StockMínimo: Number(product.minStock),
      StockBajo: product.isLowStock ? 'SI' : 'NO',
      Actualizado: new Date(product.updatedAt).toLocaleString(),
    }));
    exportToExcel(rows, 'Inventario_Productos', 'Productos');
    showToast('Archivo Excel generado', 'success');
  };

  const handleExportValorization = () => {
    if (!valorization) return;

    const rows = valorization.products.map((product) => ({
      Producto: product.productId,
      Stock: Number(product.stock),
      ÚltimoCosto: Number(product.latestCost),
      ValorTotal: Number(product.totalValue),
    }));

    exportToExcel(rows, 'Valorización_Inventario', 'Valorización');
    showToast('Reporte de valorización exportado a Excel', 'success');
  };

  const handleOpenEditModal = (product: ProductOption) => {
    setEditFormData({
      productId: product.productId,
      name: product.name,
      category: product.category,
      price: String(Number(product.price)),
      minStock: String(Number(product.minStock ?? 0)),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await updateProductMutation.mutateAsync({
        productId: editFormData.productId,
        name: editFormData.name,
        category: editFormData.category,
        price: Number(editFormData.price),
        minStock: Number(editFormData.minStock || 0),
      });

      if (response.success) {
        showToast('Producto actualizado correctamente', 'success');
        setIsEditModalOpen(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] }),
        ]);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar producto', 'error');
    }
  };

  const loadCurrentStock = async (productId: string, branchId: string) => {
    const response = await api.inventory.getStock(productId, branchId);
    const current = Number(response.data ?? 0);
    setStockFormData((prev) => ({
      ...prev,
      productId,
      branchId,
      currentQuantity: String(current),
      targetQuantity: String(current),
    }));
  };

  const handleOpenStockModal = async (product: ProductOption) => {
    const branchId = selectedBranchId || '';

    setStockFormData({
      productId: product.productId,
      branchId,
      currentQuantity: branchId ? String(Number(product.quantity)) : '0',
      targetQuantity: branchId ? String(Number(product.quantity)) : '0',
      unitCost: String(Number(product.price)),
    });
    setIsStockModalOpen(true);

    if (branchId) {
      await loadCurrentStock(product.productId, branchId);
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockFormData.branchId) {
      showToast('Debes seleccionar una sede', 'error');
      return;
    }

    try {
      const response = await adjustStockMutation.mutateAsync({
        productId: stockFormData.productId,
        branchId: stockFormData.branchId,
        quantity: Number(stockFormData.targetQuantity),
        unitCost: stockFormData.unitCost ? Number(stockFormData.unitCost) : undefined,
      });

      if (response.success) {
        showToast('Stock ajustado correctamente', 'success');
        setIsStockModalOpen(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] }),
        ]);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al ajustar stock', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const { items, errors, warnings } = await parseInventoryExcel(file, { maxRows: 500 });
      if (errors.length > 0) {
        showToast(`Errores en ${errors.length} fila(s). Corrige el archivo e intenta nuevamente.`, 'error');
        return;
      }
      if (warnings.length > 0) {
        showToast(`Advertencias: ${warnings.length} fila(s) con stock inicial sin sucursal.`, 'info');
      }

      let successCount = 0;
      let failedCount = 0;
      const batchSize = 5;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((item) =>
            api.inventory.createProduct({
              productId: item.productId,
              name: item.name,
              category: item.category,
              price: item.price,
              minStock: item.minStock,
              branchId: item.branchId,
              initialStock: item.initialStock,
              initialCost: item.initialCost,
            })
          )
        );
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount += 1;
          } else {
            failedCount += 1;
          }
        });
      }

      showToast(
        `Importación completada: ${successCount} exitosos, ${failedCount} fallidos.`,
        failedCount > 0 ? 'error' : 'success'
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] }),
      ]);
      setProductsPage(1);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al importar Excel', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-heading">Inventario</h1>
          <p className="text-gray-500 dark:text-gray-400">Catálogo de productos, categoría y stock por sede.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadValorization}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 text-black dark:text-white rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm"
          >
            <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            Valorización
          </button>
          <button
            onClick={() => setIsImportHelpOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 text-black dark:text-white rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            Formato Excel
          </button>
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 text-black dark:text-white rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm disabled:opacity-50"
          >
            <Upload className="w-5 h-5 text-[#7c3aed]" />
            {isImporting ? 'Importando...' : 'Importar Excel'}
          </button>
          <Link
            href="/dashboard/movimientos"
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 text-black dark:text-white rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-5 h-5 text-[#7c3aed]" />
            Movimientos recientes
          </Link>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-[#7c3aed]/20"
          >
            <Plus className="w-5 h-5" />
            Nuevo producto
          </button>
        </div>
      </div>

      {lowStockTotal > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-5 py-4">
          <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-black uppercase tracking-wider">
              Alerta de stock bajo ({lowStockTotal})
            </p>
          </div>
          <div className="space-y-1">
            {lowStockItems.map((item) => (
              <p key={item.productId} className="text-xs font-semibold text-red-700 dark:text-red-400">
                {item.name} ({item.productId}) - stock {Number(item.quantity)} / mínimo {Number(item.minStock)}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#141414] rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-white/5 flex flex-col md:flex-row gap-4 justify-between bg-gray-50 dark:bg-[#1a1a1a]/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, nombre o categoría..."
              className="pl-11 pr-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl w-full focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all text-sm text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setProductsPage(1);
              }}
              className="px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-xl text-sm font-semibold text-black dark:text-white"
            >
              <option value="">Todas las sedes</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleExportProducts}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-xl text-sm font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
              Exportar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1a1a1a]/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Código</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Producto</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Categoría</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5 text-right">Precio</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5 text-right">Stock</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5 text-right">Stock Mín.</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Actualizado</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading && filteredProducts.length === 0 ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-8">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.productId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-black dark:text-white">{product.productId}</td>
                    <td className="px-6 py-4 text-sm text-black dark:text-white">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{product.category}</td>
                    <td className="px-6 py-4 text-sm font-bold text-black dark:text-white text-right">S/ {Number(product.price).toFixed(2)}</td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${product.isLowStock ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                      {Number(product.quantity)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-black dark:text-white text-right">{Number(product.minStock)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(product.updatedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenStockModal(product)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/5 px-3 py-2 text-xs font-bold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        Stock
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/5 px-3 py-2 text-xs font-bold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400 dark:text-gray-500 italic">
                    No hay productos registrados en inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={productsPagination}
          isLoading={productsQuery.isFetching}
          onPageChange={setProductsPage}
        />
      </div>

      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Registrar producto"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Código</label>
              <input
                type="text"
                required
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                placeholder="SKU-001"
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Precio</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre comercial del producto"
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Categoría</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ej: Bebidas, Lácteos, Tecnología"
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Sede (si agregas stock inicial)</label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white appearance-none"
              >
                <option value="">Sin stock inicial</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Stock inicial</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.initialStock}
                onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                placeholder="0"
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Costo inicial (si hay stock)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.initialCost}
              onChange={(e) => setFormData({ ...formData, initialCost: e.target.value })}
              placeholder="0.00"
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
              Guardar producto
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar producto"
      >
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Código</label>
            <input
              type="text"
              value={editFormData.productId}
              disabled
              className="w-full px-5 py-3 bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Nombre</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Categoría</label>
            <input
              type="text"
              required
              value={editFormData.category}
              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Precio</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={editFormData.price}
              onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Stock mínimo de alerta</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editFormData.minStock}
              onChange={(e) => setEditFormData({ ...editFormData, minStock: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white"
            />
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-2 px-8 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-xl shadow-[#7c3aed]/20 disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title="Ajustar stock del producto"
      >
        <form onSubmit={handleStockSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Producto</label>
            <input
              type="text"
              value={stockFormData.productId}
              disabled
              className="w-full px-5 py-3 bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Sede</label>
            <select
              value={stockFormData.branchId}
              onChange={async (e) => {
                const branchId = e.target.value;
                setStockFormData((prev) => ({ ...prev, branchId }));
                if (branchId && stockFormData.productId) {
                  await loadCurrentStock(stockFormData.productId, branchId);
                }
              }}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-black dark:text-white appearance-none"
            >
              <option value="">Selecciona una sede</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {!stockFormData.branchId && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                Selecciona una sede para consultar y actualizar el stock.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Stock actual</label>
              <input
                type="number"
                value={stockFormData.currentQuantity}
                disabled
                className="w-full px-5 py-3 bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Nuevo stock objetivo</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={stockFormData.targetQuantity}
                disabled={!stockFormData.branchId}
                onChange={(e) => setStockFormData((prev) => ({ ...prev, targetQuantity: e.target.value }))}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white disabled:bg-gray-100 dark:disabled:bg-[#2a2a2a] disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Costo unitario para ajuste</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={stockFormData.unitCost}
              disabled={!stockFormData.branchId}
              onChange={(e) => setStockFormData((prev) => ({ ...prev, unitCost: e.target.value }))}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm text-right text-black dark:text-white disabled:bg-gray-100 dark:disabled:bg-[#2a2a2a] disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isAdjustingStock || !stockFormData.branchId}
              className="flex items-center gap-2 px-8 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-xl shadow-[#7c3aed]/20 disabled:opacity-50"
            >
              {isAdjustingStock ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Aplicar ajuste
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isValModalOpen} onClose={() => setIsValModalOpen(false)} title="Valorización de inventario">
        {valorization && (
          <div className="space-y-8">
            <div className="p-8 bg-gradient-to-br from-purple-600 to-[#7c3aed] rounded-3xl text-white shadow-xl shadow-purple-200 dark:shadow-purple-900/30">
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Valor total del almacén</p>
              <p className="text-4xl font-bold tracking-tight italic">S/ {Number(valorization.totalPortfolioValue).toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                <PieChart className="w-3 h-3" />
                Desglose por producto
              </label>
              <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2">
                {valorization.products.map((product) => (
                  <div key={product.productId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-black dark:text-white text-sm">{product.productId}</h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Stock: {product.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-black dark:text-white italic">S/ {Number(product.totalValue).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium italic">u: S/ {Number(product.latestCost).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleExportValorization}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-xl shadow-black/10 italic flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-5 h-5 text-green-400 dark:text-green-600" />
              Exportar valorización a Excel
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isImportHelpOpen}
        onClose={() => setIsImportHelpOpen(false)}
        title="Formato de importación"
      >
        <div className="space-y-6">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>Campos obligatorios: Código, Nombre, Categoría, Precio.</p>
            <p>Opcionales: StockMínimo, StockInicial, CostoInicial, BranchId.</p>
            <p>Si StockInicial &gt; 0, se recomienda incluir BranchId.</p>
            <p>Máximo recomendado: 500 filas por archivo.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1a1a1a]/50">
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Código</th>
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Nombre</th>
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Categoría</th>
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">Precio</th>
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">StockMínimo</th>
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">StockInicial</th>
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">CostoInicial</th>
                  <th className="px-3 py-2 font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/5">BranchId</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                <tr>
                  <td className="px-3 py-2 text-black dark:text-white">SKU-001</td>
                  <td className="px-3 py-2 text-black dark:text-white">Producto A</td>
                  <td className="px-3 py-2 text-black dark:text-white">Bebidas</td>
                  <td className="px-3 py-2 text-black dark:text-white">12.50</td>
                  <td className="px-3 py-2 text-black dark:text-white">5</td>
                  <td className="px-3 py-2 text-black dark:text-white">10</td>
                  <td className="px-3 py-2 text-black dark:text-white">8.90</td>
                  <td className="px-3 py-2 text-black dark:text-white">{selectedBranchId || 'branch-uuid'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
    </div>
  );
}