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
  ChevronDown,
  Filter
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
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER REESTRUCTURADO PARA MÓVILES */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Inventario</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
            Catálogo de productos, categoría y stock por sede.
          </p>
        </div>
        
        {/* Agrupación de botones permitiendo flex-wrap en móviles */}
        <div className="flex flex-wrap gap-2.5 md:gap-3 items-center">
          <button
            onClick={loadValorization}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-5 md:py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl md:rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-sm md:text-base flex-1 sm:flex-none"
          >
            <BarChart3 className="w-4 h-4 text-violet-500" />
            <span className="truncate">Valorización</span>
          </button>
          
          <button
            onClick={() => setIsImportHelpOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-5 md:py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl md:rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-sm md:text-base flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="w-4 h-4 text-gray-400" />
            <span className="truncate">Formato</span>
          </button>
          
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-5 md:py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl md:rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] disabled:opacity-50 text-sm md:text-base flex-1 sm:flex-none"
          >
            <Upload className="w-4 h-4 text-violet-500" />
            <span className="truncate">{isImporting ? 'Importando...' : 'Importar'}</span>
          </button>
          
          <Link
            href="/dashboard/movimientos"
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-5 md:py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl md:rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-sm md:text-base flex-1 sm:flex-none"
          >
            <ArrowRightLeft className="w-4 h-4 text-gray-400" />
            <span className="truncate">Movimientos</span>
          </Link>
          
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] text-sm md:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Nuevo producto
          </button>
        </div>
      </div>

      {/* ALERTA DE STOCK */}
      {lowStockTotal > 0 && (
        <div className="rounded-3xl border border-rose-200/80 dark:border-rose-500/20 bg-rose-50/80 dark:bg-rose-500/10 dark:backdrop-blur-md px-5 py-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-xl rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
          <div className="flex items-center gap-2 mb-3 text-rose-600 dark:text-rose-400 relative z-10">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
            <p className="text-xs md:text-sm font-bold uppercase tracking-wider">
              Alerta de stock bajo ({lowStockTotal})
            </p>
          </div>
          <div className="space-y-1.5 relative z-10">
            {lowStockItems.map((item) => (
              <p key={item.productId} className="text-xs md:text-sm font-medium text-rose-700 dark:text-rose-300">
                <span className="font-semibold">{item.name}</span> <span className="opacity-75">({item.productId})</span> - stock <span className="font-bold">{Number(item.quantity)}</span> / mínimo {Number(item.minStock)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre o categoría..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-medium text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
          />
        </div>
        
        <div className="flex flex-row gap-3 w-full lg:w-auto">
          {/* Selector de Sede con estilo personalizado */}
          <div className="flex-1 lg:flex-none relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
            </div>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setProductsPage(1);
              }}
              className="w-full lg:min-w-[200px] pl-10 pr-10 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer shadow-sm transition-all"
            >
              <option value="" className="bg-white dark:bg-[#1a1a2e]">Todas las sedes</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id} className="bg-white dark:bg-[#1a1a2e]">
                  {branch.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-violet-500 transition-colors" />
          </div>
          
          <button
            onClick={handleExportProducts}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm flex-1 lg:flex-none"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="truncate">Exportar</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[900px] text-sm text-left border-collapse table-fixed">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[12%]">Código</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[20%]">Producto</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[10%]">Precio</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[10%]">Stock</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[10%]">Stock Mín.</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[13%]">Actualizado</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[10%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading && filteredProducts.length === 0 ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td colSpan={8} className="px-6 py-5">
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full animate-pulse w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.productId} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white truncate">{product.productId}</td>
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white truncate">{product.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate">{product.category}</td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white text-right">S/ {Number(product.price).toFixed(2)}</td>
                    <td className={`px-6 py-4 font-bold text-right ${product.isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-white'}`}>
                      {Number(product.quantity)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 text-right">{Number(product.minStock)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 truncate">{new Date(product.updatedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleOpenStockModal(product)}
                        className="inline-flex items-center justify-center p-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-purple-400 hover:bg-violet-50 dark:hover:bg-purple-500/10 hover:border-violet-200 dark:hover:border-purple-500/30 transition-all shadow-sm"
                        title="Ajustar Stock"
                      >
                        <Boxes className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="inline-flex items-center justify-center p-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all shadow-sm"
                        title="Editar Producto"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400 italic">
                    No hay productos registrados en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTENEDOR DE PAGINACIÓN CORREGIDO (Sin estilos base para evitar la caja fantasma) */}
      <div className="flex justify-center w-full mt-2">
        <PaginationControls
          meta={productsPagination}
          isLoading={productsQuery.isFetching}
          onPageChange={setProductsPage}
        />
      </div>

      {/* MODAL: REGISTRAR PRODUCTO */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Registrar producto"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Código</label>
              <input
                type="text"
                required
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                placeholder="SKU-001"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Precio</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre comercial del producto"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ej: Bebidas, Lácteos, Tecnología"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sede (Stock inicial)</label>
              <div className="relative group">
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="" className="dark:bg-gray-900">Sin stock inicial</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="dark:bg-gray-900">
                      {branch.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stock inicial</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.initialStock}
                onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Costo inicial (si hay stock)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.initialCost}
              onChange={(e) => setFormData({ ...formData, initialCost: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar producto
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDITAR PRODUCTO */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar producto"
      >
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Código</label>
            <input
              type="text"
              value={editFormData.productId}
              disabled
              className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-500 dark:text-gray-400 opacity-70 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría</label>
            <input
              type="text"
              required
              value={editFormData.category}
              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Precio</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={editFormData.price}
              onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stock mínimo de alerta</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editFormData.minStock}
              onChange={(e) => setEditFormData({ ...editFormData, minStock: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: AJUSTAR STOCK */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title="Ajustar stock"
      >
        <form onSubmit={handleStockSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Producto</label>
            <input
              type="text"
              value={stockFormData.productId}
              disabled
              className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-500 dark:text-gray-400 opacity-70 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sede</label>
            <div className="relative group">
              <select
                value={stockFormData.branchId}
                onChange={async (e) => {
                  const branchId = e.target.value;
                  setStockFormData((prev) => ({ ...prev, branchId }));
                  if (branchId && stockFormData.productId) {
                    await loadCurrentStock(stockFormData.productId, branchId);
                  }
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              >
                <option value="" className="dark:bg-gray-900">Selecciona una sede</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id} className="dark:bg-gray-900">
                    {branch.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
            </div>
            {!stockFormData.branchId && (
              <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mt-1">
                Selecciona una sede para consultar y actualizar el stock.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stock actual</label>
              <input
                type="number"
                value={stockFormData.currentQuantity}
                disabled
                className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-bold text-sm text-gray-500 dark:text-gray-400 text-right opacity-70 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nuevo stock objetivo</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={stockFormData.targetQuantity}
                disabled={!stockFormData.branchId}
                onChange={(e) => setStockFormData((prev) => ({ ...prev, targetQuantity: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Costo unitario para ajuste</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={stockFormData.unitCost}
              disabled={!stockFormData.branchId}
              onChange={(e) => setStockFormData((prev) => ({ ...prev, unitCost: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isAdjustingStock || !stockFormData.branchId}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isAdjustingStock ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Aplicar ajuste
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VALORIZACIÓN */}
      <Modal isOpen={isValModalOpen} onClose={() => setIsValModalOpen(false)} title="Valorización de inventario">
        {valorization && (
          <div className="space-y-6">
            <div className="p-6 md:p-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1 relative z-10">Valor total del almacén</p>
              <p className="text-3xl md:text-4xl font-bold tracking-tight relative z-10">S/ {Number(valorization.totalPortfolioValue).toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <PieChart className="w-3.5 h-3.5" />
                Desglose por producto
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {valorization.products.map((product) => (
                  <div key={product.productId} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl hover:border-violet-200 dark:hover:border-purple-500/30 transition-colors">
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{product.productId}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Stock: {product.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800 dark:text-white">S/ {Number(product.totalValue).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">u: S/ {Number(product.latestCost).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleExportValorization}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-black/5 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
                Exportar a Excel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: AYUDA DE IMPORTACIÓN */}
      <Modal
        isOpen={isImportHelpOpen}
        onClose={() => setIsImportHelpOpen(false)}
        title="Formato de importación"
      >
        <div className="space-y-6">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 bg-violet-50/50 dark:bg-purple-500/10 p-4 rounded-2xl border border-violet-100 dark:border-purple-500/20">
            <p><strong className="text-violet-700 dark:text-purple-400">Obligatorios:</strong> Código, Nombre, Categoría, Precio.</p>
            <p><strong className="text-violet-700 dark:text-purple-400">Opcionales:</strong> StockMínimo, StockInicial, CostoInicial, BranchId.</p>
            <p className="text-xs mt-2 opacity-80 italic">* Si StockInicial &gt; 0, debes incluir BranchId.</p>
            <p className="text-xs opacity-80 italic">* Máximo recomendado: 500 filas.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200/80 dark:border-white/10 no-scrollbar">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5">
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/10">Código</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/10">Nombre</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/10">Categoría</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/10">Precio</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/10">StockInicial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-transparent">
                <tr>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">SKU-001</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Producto A</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Bebidas</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">12.50</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">10</td>
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