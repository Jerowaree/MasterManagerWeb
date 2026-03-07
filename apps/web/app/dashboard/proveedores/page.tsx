"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, FileSpreadsheet, Mail, Phone, Plus, ChevronDown, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { exportToExcel } from '@/lib/excel-utils';
import { PaginatedData, Supplier } from '@/lib/dashboard-types';

export default function ProveedoresPage() {
  const suppliersPageSize = 12;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliersPage, setSuppliersPage] = useState(1);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    documentType: 'RUC',
    documentNumber: '',
    ruc: '',
    status: 'active',
    isRetentionAgent: false,
    appliesDetraction: false,
    taxRegime: '',
    phone: '',
    email: '',
    address: '',
    department: '',
    province: '',
    district: '',
    paymentCondition: 'cash',
    creditDays: '',
    currency: 'PEN',
    bankName: '',
    bankAccountNumber: '',
    bankCci: '',
    bankAccountType: '',
    category: '',
    tags: '',
  });

  const normalizedSupplierPayload = useMemo(() => {
    const tags = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    return {
      name: formData.name.trim(),
      tradeName: formData.tradeName.trim() || undefined,
      documentType: formData.documentType.trim(),
      documentNumber: formData.documentNumber.trim() || undefined,
      ruc: formData.ruc.trim() || undefined,
      status: formData.status,
      isRetentionAgent: formData.isRetentionAgent,
      appliesDetraction: formData.appliesDetraction,
      taxRegime: formData.taxRegime.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim().toLowerCase() || undefined,
      address: formData.address.trim() || undefined,
      department: formData.department.trim() || undefined,
      province: formData.province.trim() || undefined,
      district: formData.district.trim() || undefined,
      paymentCondition: formData.paymentCondition,
      creditDays: formData.paymentCondition === 'credit' ? Number(formData.creditDays || 0) : 0,
      currency: formData.currency,
      bankName: formData.bankName.trim() || undefined,
      bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
      bankCci: formData.bankCci.trim() || undefined,
      bankAccountType: formData.bankAccountType.trim() || undefined,
      category: formData.category.trim() || undefined,
      tags,
    };
  }, [formData]);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'list', suppliersPage, suppliersPageSize],
    queryFn: async () => {
      const response = await api.suppliers.findAll({ page: suppliersPage, limit: suppliersPageSize });
      return response.data as PaginatedData<Supplier>;
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      tradeName?: string;
      documentType: string;
      documentNumber?: string;
      ruc?: string;
      status?: string;
      isRetentionAgent?: boolean;
      appliesDetraction?: boolean;
      taxRegime?: string;
      phone?: string;
      email?: string;
      address?: string;
      department?: string;
      province?: string;
      district?: string;
      paymentCondition?: string;
      creditDays?: number;
      currency?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankCci?: string;
      bankAccountType?: string;
      category?: string;
      tags?: string[];
    }) => api.suppliers.create(payload),
  });

  const suppliers = suppliersQuery.data?.items ?? [];
  const suppliersPagination = suppliersQuery.data?.meta;
  const loading = suppliersQuery.isLoading;
  const isSubmitting = createSupplierMutation.isPending;

  useEffect(() => {
    if (suppliersQuery.error instanceof Error) {
      showToast(suppliersQuery.error.message || 'Error al cargar proveedores', 'error');
    }
  }, [suppliersQuery.error, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedSupplierPayload.name || !normalizedSupplierPayload.documentType) {
      showToast('Nombre y tipo de documento son obligatorios', 'error');
      return;
    }
    if (!normalizedSupplierPayload.documentNumber && !normalizedSupplierPayload.ruc) {
      showToast('Ingresa número de documento o RUC', 'error');
      return;
    }
    if (formData.paymentCondition === 'credit' && !Number(formData.creditDays)) {
      showToast('Ingresa los días de crédito', 'error');
      return;
    }

    try {
      const response = await createSupplierMutation.mutateAsync(normalizedSupplierPayload);

      if (response.success) {
        showToast('Proveedor creado con éxito', 'success');
        setIsModalOpen(false);
        setFormData({
          name: '',
          tradeName: '',
          documentType: 'RUC',
          documentNumber: '',
          ruc: '',
          status: 'active',
          isRetentionAgent: false,
          appliesDetraction: false,
          taxRegime: '',
          phone: '',
          email: '',
          address: '',
          department: '',
          province: '',
          district: '',
          paymentCondition: 'cash',
          creditDays: '',
          currency: 'PEN',
          bankName: '',
          bankAccountNumber: '',
          bankCci: '',
          bankAccountType: '',
          category: '',
          tags: '',
        });
        await queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] });
        setSuppliersPage(1);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al crear proveedor', 'error');
    }
  };

  const handleExport = () => {
    if (suppliers.length === 0) {
      showToast('No hay datos para exportar', 'error');
      return;
    }

    const dataToExport = suppliers.map((s) => ({
      Proveedor: s.name,
      RUC: s.ruc,
      Email: s.email || 'N/A',
      Teléfono: s.phone || 'N/A',
      FechaRegistro: new Date(s.createdAt).toLocaleDateString(),
    }));

    exportToExcel(dataToExport, 'Base_Datos_Proveedores', 'Proveedores');
    showToast('Base de datos exportada a Excel', 'success');
  };

  return (
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER REESTRUCTURADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Proveedores</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
            Gestiona la base de datos de tus proveedores.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl md:rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-sm md:text-base"
          >
            <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
            Exportar Excel
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] text-sm md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* GRID DE PROVEEDORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && suppliers.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-white/10 animate-pulse h-48 shadow-sm" />
          ))
        ) : suppliers.length > 0 ? (
          suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:border-violet-300 dark:hover:border-purple-500/30 transition-all relative overflow-hidden group flex flex-col h-full"
            >
              {/* Resplandor decorativo hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 dark:bg-purple-500/10 blur-2xl rounded-bl-full -mr-8 -mt-8 group-hover:bg-violet-500/10 dark:group-hover:bg-purple-500/20 transition-colors duration-500 pointer-events-none" />

              <div className="w-12 h-12 md:w-14 md:h-14 bg-violet-50/50 dark:bg-purple-500/10 border border-violet-100 dark:border-purple-500/20 rounded-2xl flex items-center justify-center mb-4 text-violet-600 dark:text-purple-400 group-hover:bg-violet-600 group-hover:text-white dark:group-hover:bg-purple-600 transition-colors shadow-sm relative z-10">
                <Building2 className="w-6 h-6 md:w-7 md:h-7" />
              </div>

              <div className="flex-1 relative z-10">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1 tracking-tight truncate pr-2">{supplier.name}</h3>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-white/5">
                    {supplier.documentType ?? 'DOC'}: {supplier.documentNumber ?? supplier.ruc ?? '-'}
                  </span>
                  <span className={`flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                    (supplier.status ?? 'active') === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/20'
                  }`}>
                    {(supplier.status ?? 'active') === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                    {(supplier.status ?? 'active') === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-3 pt-5 border-t border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <span className="truncate font-medium">{supplier.email || 'Sin correo'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <span className="font-medium">{supplier.phone || 'Sin teléfono'}</span>
                  </div>
                  {supplier.category && (
                    <div className="mt-2 inline-block text-[10px] text-violet-600 dark:text-purple-400 font-bold uppercase tracking-widest bg-violet-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-lg border border-violet-100 dark:border-purple-500/20">
                      {supplier.category}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white dark:bg-white/5 dark:backdrop-blur-xl p-20 rounded-3xl border border-gray-200/80 dark:border-white/10 border-dashed text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay proveedores registrados aún.</p>
          </div>
        )}
      </div>

      <div className="flex justify-center w-full mt-2">
        <PaginationControls
          meta={suppliersPagination}
          isLoading={suppliersQuery.isFetching}
          onPageChange={setSuppliersPage}
        />
      </div>

      {/* MODAL: CREAR PROVEEDOR */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Proveedor">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Razón Social</label>
              <input
                required
                type="text"
                maxLength={120}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Distribuidora Lima SAC"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre Comercial</label>
              <input
                type="text"
                maxLength={120}
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                placeholder="Ej: Distribuidora Lima"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de Documento</label>
              <div className="relative group">
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="RUC" className="dark:bg-gray-900">RUC</option>
                  <option value="DNI" className="dark:bg-gray-900">DNI</option>
                  <option value="CE" className="dark:bg-gray-900">CE</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Número Documento</label>
              <input
                type="text"
                maxLength={24}
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="Ej: 20123456789"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">RUC</label>
              <input
                type="text"
                maxLength={20}
                value={formData.ruc}
                onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                placeholder="Ej: 20123456789"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estado</label>
              <div className="relative group">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="active" className="dark:bg-gray-900">Activo</option>
                  <option value="inactive" className="dark:bg-gray-900">Inactivo</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Régimen</label>
              <input
                type="text"
                maxLength={60}
                value={formData.taxRegime}
                onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                placeholder="Ej: General"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría</label>
              <input
                type="text"
                maxLength={60}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ej: Mercadería"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Teléfono</label>
              <input
                type="tel"
                maxLength={20}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej: 999 999 999"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Correo</label>
              <input
                type="email"
                maxLength={120}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ej: compras@proveedor.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dirección fiscal</label>
            <input
              type="text"
              maxLength={255}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Av. Principal 123"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Departamento</label>
              <input
                type="text"
                maxLength={60}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Provincia</label>
              <input
                type="text"
                maxLength={60}
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Distrito</label>
              <input
                type="text"
                maxLength={60}
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Condición de pago</label>
              <div className="relative group">
                <select
                  value={formData.paymentCondition}
                  onChange={(e) => setFormData({ ...formData, paymentCondition: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="cash" className="dark:bg-gray-900">Contado</option>
                  <option value="credit" className="dark:bg-gray-900">Crédito</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Días de crédito</label>
              <input
                type="number"
                min="0"
                value={formData.creditDays}
                onChange={(e) => setFormData({ ...formData, creditDays: e.target.value })}
                disabled={formData.paymentCondition !== 'credit'}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-right text-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Moneda</label>
              <div className="relative group">
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="PEN" className="dark:bg-gray-900">PEN</option>
                  <option value="USD" className="dark:bg-gray-900">USD</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Banco</label>
              <input
                type="text"
                maxLength={60}
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de cuenta</label>
              <input
                type="text"
                maxLength={30}
                value={formData.bankAccountType}
                onChange={(e) => setFormData({ ...formData, bankAccountType: e.target.value })}
                placeholder="Ahorros / Corriente"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Número de cuenta</label>
              <input
                type="text"
                maxLength={32}
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">CCI</label>
              <input
                type="text"
                maxLength={32}
                value={formData.bankCci}
                onChange={(e) => setFormData({ ...formData, bankCci: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Etiquetas (separadas por coma)</label>
            <input
              type="text"
              maxLength={200}
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Mercadería, Local, Servicios..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3.5 text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isSubmitting ? 'Guardando...' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}