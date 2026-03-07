"use client";

import React, { useEffect, useState } from 'react';
import { Users, Plus, Mail, Phone, MoreHorizontal, Save, Loader2, FileSpreadsheet, MapPin, ChevronDown } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/auth-context';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { exportToExcel } from '@/lib/excel-utils';
import { Customer, PaginatedData } from '@/lib/dashboard-types';

export default function ClientesPage() {
  const customersPageSize = 12;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customersPage, setCustomersPage] = useState(1);
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    documentType: 'DNI',
    documentNumber: '',
    address: '',
  });

  const normalizeCustomerPayload = () => {
    const name = formData.name.trim();
    const documentNumber = formData.documentNumber.trim();
    return {
      name,
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      documentType: formData.documentType.trim(),
      documentNumber,
      address: formData.address.trim(),
    };
  };

  const customersQuery = useQuery({
    queryKey: ['customers', 'list', customersPage, customersPageSize],
    queryFn: async () => {
      const response = await api.customers.findAll({ page: customersPage, limit: customersPageSize });
      return response.data as PaginatedData<Customer>;
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      phone: string;
      documentType: string;
      documentNumber: string;
      address: string;
      branchId?: string;
    }) => api.customers.create(payload),
  });

  const customers = customersQuery.data?.items ?? [];
  const customersPagination = customersQuery.data?.meta;
  const loading = customersQuery.isLoading;
  const isSubmitting = createCustomerMutation.isPending;

  useEffect(() => {
    if (customersQuery.error instanceof Error) {
      showToast(customersQuery.error.message || 'Error al cargar clientes', 'error');
    }
  }, [customersQuery.error, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const payload = normalizeCustomerPayload();
    if (!payload.name || !payload.documentNumber) {
      showToast('Nombre y documento son obligatorios', 'error');
      return;
    }

    try {
      const response = await createCustomerMutation.mutateAsync({
        ...payload,
        branchId: user?.branchId,
      });
      if (response.success) {
        showToast('Cliente creado con éxito', 'success');
        setIsModalOpen(false);
        setFormData({ name: '', email: '', phone: '', documentType: 'DNI', documentNumber: '', address: '' });
        await queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
        setCustomersPage(1);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al crear cliente', 'error');
    }
  };

  const handleExport = () => {
    if (customers.length === 0) {
      showToast('No hay datos para exportar', 'error');
      return;
    }

    const dataToExport = customers.map((c) => ({
      Nombre: c.name,
      TipoDoc: c.documentType,
      NumDoc: c.documentNumber,
      Email: c.email || 'N/A',
      Telefono: c.phone || 'N/A',
      FechaRegistro: new Date(c.createdAt).toLocaleDateString(),
    }));

    exportToExcel(dataToExport, 'Base_Datos_Clientes', 'Clientes');
    showToast('Base de datos exportada a Excel', 'success');
  };

  return (
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER REESTRUCTURADO */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between w-full gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight truncate">
            Clientes
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-3.5 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] text-sm md:text-base shrink-0"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Nuevo Cliente</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Base de datos centralizada de tus clientes y contactos.
        </p>
      </div>

      {/* BOTÓN EXPORTAR PARA MÓVIL (Visible solo en sm hacia abajo) */}
      <div className="sm:hidden w-full">
        <button
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm text-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* GRID DE CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && customers.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-white/10 animate-pulse h-48 shadow-sm" />
          ))
        ) : customers.length > 0 ? (
          customers.map((customer) => (
            <div 
              key={customer.id} 
              className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:border-violet-300 dark:hover:border-purple-500/30 transition-all group overflow-hidden relative flex flex-col h-full"
            >
              {/* Resplandor decorativo hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 dark:bg-purple-500/10 blur-2xl rounded-bl-full -mr-8 -mt-8 group-hover:bg-violet-500/10 dark:group-hover:bg-purple-500/20 transition-colors duration-500 pointer-events-none" />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-violet-50/50 dark:bg-purple-500/10 border border-violet-100 dark:border-purple-500/20 rounded-2xl flex items-center justify-center font-bold text-violet-600 dark:text-purple-400 text-xl group-hover:bg-violet-600 group-hover:text-white dark:group-hover:bg-purple-600 transition-colors shadow-sm">
                  {customer.name[0]}
                </div>
                <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-white/10">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 relative z-10">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1 tracking-tight truncate">{customer.name}</h3>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">
                  {customer.documentType}: {customer.documentNumber}
                </p>

                <div className="space-y-3 pt-5 border-t border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <span className="truncate font-medium">{customer.email || 'Sin correo'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <span className="font-medium">{customer.phone || 'Sin teléfono'}</span>
                  </div>
                  {customer.address && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <span className="truncate font-medium">{customer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white dark:bg-white/5 dark:backdrop-blur-xl p-20 rounded-3xl border border-gray-200/80 dark:border-white/10 border-dashed text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay clientes registrados aún.</p>
          </div>
        )}
      </div>

      <div className="flex justify-center w-full mt-2">
        <PaginationControls
          meta={customersPagination}
          isLoading={customersQuery.isFetching}
          onPageChange={setCustomersPage}
        />
      </div>

      {/* MODAL: CREAR CLIENTE */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Cliente">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre Completo o Empresa</label>
            <input
              required
              type="text"
              maxLength={120}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Juan Pérez o Tech SAC"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo Documento</label>
              <div className="relative group">
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="DNI" className="dark:bg-gray-900">DNI (Perú)</option>
                  <option value="RUC" className="dark:bg-gray-900">RUC</option>
                  <option value="PASSPORT" className="dark:bg-gray-900">Pasaporte</option>
                  <option value="CE" className="dark:bg-gray-900">C. Extranjería</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-violet-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">N° Documento</label>
              <input
                required
                type="text"
                maxLength={24}
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="7728..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</label>
              <input
                type="email"
                maxLength={120}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Teléfono</label>
              <input
                type="tel"
                maxLength={20}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="999 000 000"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dirección</label>
            <input
              type="text"
              maxLength={255}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Av. Las Camelias 123, San Isidro"
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
              className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}