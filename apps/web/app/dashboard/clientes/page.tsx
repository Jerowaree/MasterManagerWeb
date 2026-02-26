"use client";

import React, { useEffect, useState } from 'react';
import { Users, Plus, Mail, Phone, MoreHorizontal, Save, Loader2, FileSpreadsheet, MapPin } from 'lucide-react';
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
    if (!formData.name || !formData.documentNumber) {
      showToast('Nombre y documento son obligatorios', 'error');
      return;
    }

    try {
      const response = await createCustomerMutation.mutateAsync({
        ...formData,
        branchId: user?.branchId,
      });
      if (response.success) {
        showToast('Cliente creado con exito', 'success');
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-heading">Clientes</h1>
          <p className="text-gray-500">Base de datos centralizada de tus clientes y contactos.</p>
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
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && customers.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 animate-pulse h-40" />)
        ) : customers.length > 0 ? (
          customers.map((customer) => (
            <div key={customer.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/50 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center font-bold text-[#7c3aed] text-xl group-hover:bg-[#7c3aed] group-hover:text-white transition-colors">
                  {customer.name[0]}
                </div>
                <button className="p-2 text-gray-400 hover:text-black transition-colors rounded-xl hover:bg-gray-50">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <h3 className="font-bold text-lg text-black mb-1 relative z-10">{customer.name}</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 relative z-10">
                {customer.documentType}: {customer.documentNumber}
              </p>

              <div className="space-y-3 pt-4 border-t border-gray-50 relative z-10">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate font-medium">{customer.email || 'Sin correo'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{customer.phone || 'Sin telefono'}</span>
                </div>
                {customer.address && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate font-medium">{customer.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white p-20 rounded-3xl border border-gray-100 border-dashed text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 italic font-medium">No hay clientes registrados aun.</p>
          </div>
        )}
      </div>
      <PaginationControls
        meta={customersPagination}
        isLoading={customersQuery.isFetching}
        onPageChange={setCustomersPage}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Cliente">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre Completo o Empresa</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Juan Perez o Tech SAC"
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Tipo Documento</label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
              >
                <option value="DNI">DNI (Peru)</option>
                <option value="RUC">RUC</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="CE">C. Extranjeria</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">N Documento</label>
              <input
                required
                type="text"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="7728..."
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Telefono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="999 000 000"
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Direccion</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Av. Las Camelias 123, San Isidro"
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Cliente
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
