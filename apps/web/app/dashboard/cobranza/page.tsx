"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  DollarSign,
  FileText,
  Filter,
  Loader2,
  Plus,
  ReceiptText,
  Search,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/auth-context';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Branch, Customer, PaginatedData, Receivable } from '@/lib/dashboard-types';

const statusStyles: Record<string, string> = {
  open: 'bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  overdue: 'bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  paid: 'bg-emerald-50 text-emerald-600 border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  cancelled: 'bg-gray-50 text-gray-600 border border-gray-200/50 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
};

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CobranzaPage() {
  const receivablesPageSize = 12;
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(user?.branchId ?? '');
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);

  const [formData, setFormData] = useState({
    branchId: user?.branchId ?? '',
    customerId: '',
    totalAmount: '',
    currency: 'PEN',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    documentRef: '',
    reminderIntervalDays: '3',
    remindersPaused: false,
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'efectivo',
    reference: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  const receivablesQuery = useQuery({
    queryKey: ['receivables', 'list', receivablesPage, receivablesPageSize, statusFilter, search, branchFilter],
    queryFn: async () => {
      const response = await api.receivables.findAll({
        page: receivablesPage,
        limit: receivablesPageSize,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        branchId: branchFilter || undefined,
      });
      return response.data as PaginatedData<Receivable>;
    },
  });

  const branchesQuery = useQuery({
    queryKey: ['branches', 'list', 'receivables'],
    queryFn: async () => {
      const response = await api.branches.findAll({ page: 1, limit: 100 });
      return response.data as PaginatedData<Branch>;
    },
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'list', 'receivables'],
    queryFn: async () => {
      const response = await api.customers.findAll({ page: 1, limit: 200 });
      return response.data as PaginatedData<Customer>;
    },
  });

  const createReceivableMutation = useMutation({
    mutationFn: (payload: {
      branchId: string;
      customerId?: string;
      totalAmount: number;
      currency?: string;
      dueDate: string;
      documentRef?: string;
      reminderIntervalDays?: number;
      remindersPaused?: boolean;
    }) => api.receivables.create(payload),
  });

  const addPaymentMutation = useMutation({
    mutationFn: (payload: { receivableId: string; amount: number; method?: string; reference?: string; paymentDate?: string }) =>
      api.receivables.addPayment(payload.receivableId, {
        amount: payload.amount,
        method: payload.method,
        reference: payload.reference,
        paymentDate: payload.paymentDate,
      }),
  });

  const receivables = receivablesQuery.data?.items ?? [];
  const receivablesPagination = receivablesQuery.data?.meta;
  const branches = useMemo(() => branchesQuery.data?.items ?? [], [branchesQuery.data?.items]);
  const customers = useMemo(() => customersQuery.data?.items ?? [], [customersQuery.data?.items]);

  const defaultBranchId = useMemo(() => {
    if (user?.branchId) return user.branchId;
    return branches[0]?.id ?? '';
  }, [branches, user?.branchId]);

  useEffect(() => {
    if (!formData.branchId && defaultBranchId) {
      setFormData((prev) => ({ ...prev, branchId: defaultBranchId }));
    }
  }, [defaultBranchId, formData.branchId]);

  useEffect(() => {
    if (receivablesQuery.error instanceof Error) {
      showToast(receivablesQuery.error.message || 'Error al cargar cobranza', 'error');
    }
  }, [receivablesQuery.error, showToast]);

  useEffect(() => {
    if (!branchFilter && user?.branchId) {
      setBranchFilter(user.branchId);
    }
  }, [branchFilter, user?.branchId]);

  const resetCreateForm = () => {
    setFormData({
      branchId: defaultBranchId,
      customerId: '',
      totalAmount: '',
      currency: 'PEN',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      documentRef: '',
      reminderIntervalDays: '3',
      remindersPaused: false,
    });
  };

  const resetPaymentForm = () => {
    setPaymentData({
      amount: '',
      method: 'efectivo',
      reference: '',
      paymentDate: new Date().toISOString().slice(0, 10),
    });
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (createReceivableMutation.isPending) return;

    if (!formData.branchId) {
      showToast('Selecciona una sucursal', 'error');
      return;
    }

    const totalAmount = toNumber(formData.totalAmount);
    if (totalAmount <= 0) {
      showToast('El monto debe ser mayor a 0', 'error');
      return;
    }

    try {
      const response = await createReceivableMutation.mutateAsync({
        branchId: formData.branchId,
        customerId: formData.customerId || undefined,
        totalAmount,
        currency: formData.currency.trim() || 'PEN',
        dueDate: formData.dueDate,
        documentRef: formData.documentRef.trim() || undefined,
        reminderIntervalDays: Number(formData.reminderIntervalDays) || 3,
        remindersPaused: formData.remindersPaused,
      });

      if (response.success) {
        showToast('Cuenta por cobrar creada', 'success');
        setIsCreateOpen(false);
        resetCreateForm();
        await queryClient.invalidateQueries({ queryKey: ['receivables', 'list'] });
        setReceivablesPage(1);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear cuenta por cobrar', 'error');
    }
  };

  const handleOpenPayment = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    resetPaymentForm();
    setIsPaymentOpen(true);
  };

  const handleAddPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedReceivable || addPaymentMutation.isPending) return;

    const amount = toNumber(paymentData.amount);
    if (amount <= 0) {
      showToast('El pago debe ser mayor a 0', 'error');
      return;
    }

    try {
      const response = await addPaymentMutation.mutateAsync({
        receivableId: selectedReceivable.id,
        amount,
        method: paymentData.method.trim() || undefined,
        reference: paymentData.reference.trim() || undefined,
        paymentDate: paymentData.paymentDate,
      });

      if (response.success) {
        showToast('Pago registrado', 'success');
        setIsPaymentOpen(false);
        setSelectedReceivable(null);
        await queryClient.invalidateQueries({ queryKey: ['receivables', 'list'] });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar el pago', 'error');
    }
  };

  const isLoading = receivablesQuery.isLoading;

  return (
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER REESTRUCTURADO */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between w-full gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight truncate">
            Cobranza
          </h1>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-1.5 md:gap-2 px-3.5 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] text-sm md:text-base shrink-0"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Nueva cuenta</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Gestiona cuentas por cobrar, vencimientos y recordatorios.
        </p>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por referencia o documento..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-medium text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
          />
        </div>
        
        {/* Contenedor Flex para la fila de filtros (Móvil y Escritorio) */}
        <div className="flex flex-row gap-3 w-full lg:w-auto">
          {/* Filtro de Estado */}
          <div className="flex-1 lg:flex-none relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setReceivablesPage(1);
              }}
              className="w-full lg:min-w-[160px] pl-10 pr-10 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer shadow-sm transition-all"
            >
              <option value="" className="bg-white dark:bg-[#1a1a2e]">Todos</option>
              <option value="open" className="bg-white dark:bg-[#1a1a2e]">Abiertos</option>
              <option value="overdue" className="bg-white dark:bg-[#1a1a2e]">Vencidos</option>
              <option value="paid" className="bg-white dark:bg-[#1a1a2e]">Pagados</option>
              <option value="cancelled" className="bg-white dark:bg-[#1a1a2e]">Cancelados</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-violet-500 transition-colors" />
          </div>
          
          {/* Filtro de Sucursal */}
          <div className="flex-1 lg:flex-none relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
            </div>
            <select
              value={branchFilter}
              onChange={(event) => {
                setBranchFilter(event.target.value);
                setReceivablesPage(1);
              }}
              disabled={Boolean(user?.branchId)}
              className="w-full lg:min-w-[200px] pl-10 pr-10 py-3 bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 dark:backdrop-blur-md rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <option value="" className="bg-white dark:bg-[#1a1a2e]">Sedes: Todas</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id} className="bg-white dark:bg-[#1a1a2e]">
                  {branch.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-violet-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL - CORREGIDA CON W-FULL Y PORCENTAJES EN TH */}
      <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[900px] text-sm text-left border-collapse table-fixed">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[20%]">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Documento</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Sucursal</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[15%]">Vencimiento</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[10%]">Estado</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[10%]">Saldo</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap text-right w-[15%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {isLoading && receivables.length === 0 ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="px-6 py-5" colSpan={7}>
                      <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : receivables.length > 0 ? (
                receivables.map((receivable) => {
                  const balance = Number(receivable.totalAmount) - Number(receivable.amountPaid);
                  return (
                    <tr key={receivable.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 dark:text-white truncate">
                          {receivable.customer?.name || 'Cliente sin nombre'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {receivable.customer?.email || 'Sin correo'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{receivable.documentRef || 'N/A'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate">Creado: {formatDate(receivable.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                        {receivable.branch?.name || 'Sin sucursal'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                          <CalendarClock className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{formatDate(receivable.dueDate)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">Prox: {formatDate(receivable.nextReminderAt)}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${statusStyles[receivable.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {receivable.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <p className="font-bold text-gray-800 dark:text-white">
                          {balance.toFixed(2)} {receivable.currency}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Pagado: {Number(receivable.amountPaid).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenPayment(receivable)}
                          className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm group-hover:border-violet-200 dark:group-hover:border-purple-500/30"
                        >
                          <ReceiptText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          Pago
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400 italic">
                    No hay cuentas por cobrar registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl rounded-2xl border border-gray-200/80 dark:border-white/10 p-2 shadow-sm">
        <PaginationControls
          meta={receivablesPagination}
          isLoading={receivablesQuery.isFetching}
          onPageChange={setReceivablesPage}
        />
      </div>

      {/* MODAL: NUEVA CUENTA */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nueva cuenta por cobrar">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sucursal</label>
            <select
              value={formData.branchId}
              onChange={(event) => setFormData((prev) => ({ ...prev, branchId: event.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all appearance-none"
            >
              <option value="" className="dark:bg-gray-900">Selecciona sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id} className="dark:bg-gray-900">
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cliente</label>
            <select
              value={formData.customerId}
              onChange={(event) => setFormData((prev) => ({ ...prev, customerId: event.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all appearance-none"
            >
              <option value="" className="dark:bg-gray-900">Cliente opcional</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id} className="dark:bg-gray-900">
                  {customer.name} - {customer.documentNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Monto total</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={formData.totalAmount}
                  onChange={(event) => setFormData((prev) => ({ ...prev, totalAmount: event.target.value }))}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Moneda</label>
              <input
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fecha de vencimiento</label>
              <input
                value={formData.dueDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, dueDate: event.target.value }))}
                type="date"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Referencia</label>
              <input
                value={formData.documentRef}
                onChange={(event) => setFormData((prev) => ({ ...prev, documentRef: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                placeholder="Factura, boleta o nota"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recordatorio (dias)</label>
              <input
                value={formData.reminderIntervalDays}
                onChange={(event) => setFormData((prev) => ({ ...prev, reminderIntervalDays: event.target.value }))}
                type="number"
                min="1"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3 mt-8 p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
              <input
                id="remindersPaused"
                type="checkbox"
                checked={formData.remindersPaused}
                onChange={(event) => setFormData((prev) => ({ ...prev, remindersPaused: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 dark:bg-gray-900"
              />
              <label htmlFor="remindersPaused" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Pausar recordatorios
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={createReceivableMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {createReceivableMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Crear cuenta
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: REGISTRAR PAGO */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Registrar pago">
        <form onSubmit={handleAddPayment} className="space-y-6">
          <div className="rounded-2xl bg-violet-50/50 dark:bg-purple-500/10 border border-violet-100 dark:border-purple-500/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-purple-400 mb-1">Cuenta</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">
              {selectedReceivable?.customer?.name || 'Cliente'} 
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Ref: {selectedReceivable?.documentRef || 'Sin referencia'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Monto</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={paymentData.amount}
                onChange={(event) => setPaymentData((prev) => ({ ...prev, amount: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Método de pago</label>
              <input
                value={paymentData.method}
                onChange={(event) => setPaymentData((prev) => ({ ...prev, method: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Referencia (Voucher)</label>
              <input
                value={paymentData.reference}
                onChange={(event) => setPaymentData((prev) => ({ ...prev, reference: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fecha de pago</label>
            <input
              value={paymentData.paymentDate}
              onChange={(event) => setPaymentData((prev) => ({ ...prev, paymentDate: event.target.value }))}
              type="date"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={addPaymentMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {addPaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <ReceiptText className="w-5 h-5" />
                  Registrar pago
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}