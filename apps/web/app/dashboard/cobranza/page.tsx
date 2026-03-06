"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
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
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  cancelled: 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300',
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
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-heading">Cobranza</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestiona cuentas por cobrar, vencimientos y recordatorios.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-[#7c3aed]/20"
          >
            <Plus className="w-5 h-5" />
            Nueva cuenta
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por referencia o documento"
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-2xl px-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setReceivablesPage(1);
            }}
            className="bg-transparent py-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="open">Abiertos</option>
            <option value="overdue">Vencidos</option>
            <option value="paid">Pagados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-2xl px-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={branchFilter}
            onChange={(event) => {
              setBranchFilter(event.target.value);
              setReceivablesPage(1);
            }}
            disabled={Boolean(user?.branchId)}
            className="bg-transparent py-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none disabled:cursor-not-allowed"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Cliente</th>
                <th className="px-6 py-4 text-left font-semibold">Documento</th>
                <th className="px-6 py-4 text-left font-semibold">Sucursal</th>
                <th className="px-6 py-4 text-left font-semibold">Vencimiento</th>
                <th className="px-6 py-4 text-left font-semibold">Estado</th>
                <th className="px-6 py-4 text-right font-semibold">Saldo</th>
                <th className="px-6 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && receivables.length === 0 ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-gray-100 dark:border-white/5">
                    <td className="px-6 py-5" colSpan={7}>
                      <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : receivables.length > 0 ? (
                receivables.map((receivable) => {
                  const balance = Number(receivable.totalAmount) - Number(receivable.amountPaid);
                  return (
                    <tr key={receivable.id} className="border-b border-gray-100 dark:border-white/5">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {receivable.customer?.name || 'Cliente sin nombre'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {receivable.customer?.email || 'Sin correo'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{receivable.documentRef || 'N/A'}</span>
                        </div>
                        <p className="text-xs text-gray-500">Creado: {formatDate(receivable.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {receivable.branch?.name || 'Sin sucursal'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <CalendarClock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(receivable.dueDate)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Prox. recordatorio: {formatDate(receivable.nextReminderAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[receivable.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {receivable.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {balance.toFixed(2)} {receivable.currency}
                        </p>
                        <p className="text-xs text-gray-500">Pagado: {Number(receivable.amountPaid).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenPayment(receivable)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                        >
                          <ReceiptText className="w-4 h-4" />
                          Registrar pago
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No hay cuentas por cobrar registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationControls
        meta={receivablesPagination}
        isLoading={receivablesQuery.isFetching}
        onPageChange={setReceivablesPage}
      />

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nueva cuenta por cobrar">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sucursal</label>
            <select
              value={formData.branchId}
              onChange={(event) => setFormData((prev) => ({ ...prev, branchId: event.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
            >
              <option value="">Selecciona sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cliente</label>
            <select
              value={formData.customerId}
              onChange={(event) => setFormData((prev) => ({ ...prev, customerId: event.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
            >
              <option value="">Cliente opcional</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.documentNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monto total</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={formData.totalAmount}
                  onChange={(event) => setFormData((prev) => ({ ...prev, totalAmount: event.target.value }))}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Moneda</label>
              <input
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha de vencimiento</label>
              <input
                value={formData.dueDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, dueDate: event.target.value }))}
                type="date"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Referencia</label>
              <input
                value={formData.documentRef}
                onChange={(event) => setFormData((prev) => ({ ...prev, documentRef: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
                placeholder="Factura, boleta o nota"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recordatorio (dias)</label>
              <input
                value={formData.reminderIntervalDays}
                onChange={(event) => setFormData((prev) => ({ ...prev, reminderIntervalDays: event.target.value }))}
                type="number"
                min="1"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
              />
            </div>
            <div className="flex items-center gap-3 mt-8">
              <input
                id="remindersPaused"
                type="checkbox"
                checked={formData.remindersPaused}
                onChange={(event) => setFormData((prev) => ({ ...prev, remindersPaused: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="remindersPaused" className="text-sm text-gray-600 dark:text-gray-300">
                Pausar recordatorios
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={createReceivableMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all"
          >
            {createReceivableMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Crear cuenta
              </>
            )}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Registrar pago">
        <form onSubmit={handleAddPayment} className="space-y-5">
          <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4">
            <p className="text-sm text-gray-500">Cuenta</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {selectedReceivable?.customer?.name || 'Cliente'} - {selectedReceivable?.documentRef || 'Sin referencia'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monto</label>
            <input
              value={paymentData.amount}
              onChange={(event) => setPaymentData((prev) => ({ ...prev, amount: event.target.value }))}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Metodo</label>
              <input
                value={paymentData.method}
                onChange={(event) => setPaymentData((prev) => ({ ...prev, method: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Referencia</label>
              <input
                value={paymentData.reference}
                onChange={(event) => setPaymentData((prev) => ({ ...prev, reference: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha de pago</label>
            <input
              value={paymentData.paymentDate}
              onChange={(event) => setPaymentData((prev) => ({ ...prev, paymentDate: event.target.value }))}
              type="date"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={addPaymentMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#111827] text-white rounded-2xl font-bold hover:bg-black transition-all"
          >
            {addPaymentMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <ReceiptText className="w-4 h-4" />
                Registrar pago
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
