"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, FileSpreadsheet, Mail, Phone, Plus } from 'lucide-react';
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
      showToast('Ingresa numero de documento o RUC', 'error');
      return;
    }
    if (formData.paymentCondition === 'credit' && !Number(formData.creditDays)) {
      showToast('Ingresa los dias de credito', 'error');
      return;
    }

    try {
      const response = await createSupplierMutation.mutateAsync(normalizedSupplierPayload);

      if (response.success) {
        showToast('Proveedor creado con exito', 'success');
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
      Telefono: s.phone || 'N/A',
      FechaRegistro: new Date(s.createdAt).toLocaleDateString(),
    }));

    exportToExcel(dataToExport, 'Base_Datos_Proveedores', 'Proveedores');
    showToast('Base de datos exportada a Excel', 'success');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-heading">Proveedores</h1>
          <p className="text-gray-500">Gestiona la base de datos de tus proveedores.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm w-fit"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Exportar Excel
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-[#7c3aed]/20 w-fit"
          >
            <Plus className="w-5 h-5" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && suppliers.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 animate-pulse h-40" />
          ))
        ) : suppliers.length > 0 ? (
          suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center font-bold text-[#7c3aed] text-xl">
                <Building2 className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-lg text-black mt-4">{supplier.name}</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                {supplier.documentType ?? 'DOC'}: {supplier.documentNumber ?? supplier.ruc ?? '-'}
              </p>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">
                Estado: {(supplier.status ?? 'active') === 'active' ? 'Activo' : 'Inactivo'}
              </p>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate font-medium">{supplier.email || 'Sin correo'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{supplier.phone || 'Sin telefono'}</span>
                </div>
                {supplier.category && (
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{supplier.category}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white p-20 rounded-3xl border border-gray-100 border-dashed text-center">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 italic font-medium">No hay proveedores registrados aun.</p>
          </div>
        )}
      </div>

      <PaginationControls
        meta={suppliersPagination}
        isLoading={suppliersQuery.isFetching}
        onPageChange={setSuppliersPage}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Proveedor">
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-6 mx-auto w-full max-w-sm">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Razon Social</label>
                <input
                  required
                  type="text"
                  maxLength={120}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Distribuidora Lima SAC"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre Comercial</label>
                <input
                  type="text"
                  maxLength={120}
                  value={formData.tradeName}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  placeholder="Ej: Distribuidora Lima"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Tipo de Documento</label>
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
                >
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Numero Documento</label>
                <input
                  type="text"
                  maxLength={24}
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="Ej: 20123456789"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">RUC</label>
                <input
                  type="text"
                  maxLength={20}
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                  placeholder="Ej: 20123456789"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Regimen</label>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.taxRegime}
                  onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                  placeholder="Ej: General"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Categoria</label>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ej: Mercaderia"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Telefono</label>
                <input
                  type="tel"
                  maxLength={20}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 999 999 999"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Correo</label>
                <input
                  type="email"
                  maxLength={120}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ej: compras@proveedor.com"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Direccion fiscal</label>
              <input
                type="text"
                maxLength={255}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ej: Av. Principal 123"
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Departamento</label>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Provincia</label>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Distrito</label>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Condicion de pago</label>
                <select
                  value={formData.paymentCondition}
                  onChange={(e) => setFormData({ ...formData, paymentCondition: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
                >
                  <option value="cash">Contado</option>
                  <option value="credit">Credito</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Dias de credito</label>
                <input
                  type="number"
                  min="0"
                  value={formData.creditDays}
                  onChange={(e) => setFormData({ ...formData, creditDays: e.target.value })}
                  disabled={formData.paymentCondition !== 'credit'}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Moneda</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
                >
                  <option value="PEN">PEN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Banco</label>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Tipo de cuenta</label>
                <input
                  type="text"
                  maxLength={30}
                  value={formData.bankAccountType}
                  onChange={(e) => setFormData({ ...formData, bankAccountType: e.target.value })}
                  placeholder="Ahorros / Corriente"
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Numero de cuenta</label>
                <input
                  type="text"
                  maxLength={32}
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">CCI</label>
                <input
                  type="text"
                  maxLength={32}
                  value={formData.bankCci}
                  onChange={(e) => setFormData({ ...formData, bankCci: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Etiquetas (coma separadas)</label>
              <input
                type="text"
                maxLength={200}
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Mercaderia, Local"
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-gray-500 font-bold hover:text-black transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Proveedor'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
