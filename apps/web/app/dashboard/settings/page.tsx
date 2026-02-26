"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User, Shield, Building, Mail, Lock, Save, Loader2, Users, CreditCard, ReceiptText } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { CompanySettingsForm } from '@/components/settings/CompanySettingsForm';
import { CreateWorkerForm } from '@/components/settings/CreateWorkerForm';
import { CompanySettingsFormValues, CreateWorkerFormValues } from '@/components/settings/settings-validators';
import { PasswordStrengthHint } from '@/components/forms/PasswordStrengthHint';
import { evaluatePassword } from '@/lib/password-policy';
import { CriticalActionModal } from '@/components/settings/CriticalActionModal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { PaginationMeta, PaginatedData, SunatDocument, SunatStatus } from '@/lib/dashboard-types';

type ProfileData = {
  id: string;
  email: string;
  role: string;
  company: {
    id: string;
    name: string;
    emailDomain: string;
    country: string;
    currency: string;
    timezone: string;
    plan: string;
  };
};

type CompanyUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

type PlanOption = {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
};

type PendingAction =
  | { type: 'domain-change'; values: CompanySettingsFormValues }
  | { type: 'create-admin'; values: CreateWorkerFormValues };

export default function SettingsPage() {
  const companyUsersPageSize = 10;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [isCriticalModalOpen, setIsCriticalModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [companyUsersPagination, setCompanyUsersPagination] = useState<PaginationMeta | undefined>();
  const [companyUsersPage, setCompanyUsersPage] = useState(1);
  const [billingPlans, setBillingPlans] = useState<PlanOption[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentPassword, setPaymentPassword] = useState('');
  const [loadingBillingPlans, setLoadingBillingPlans] = useState(false);
  const [payingPlan, setPayingPlan] = useState(false);
  const [sunatStatus, setSunatStatus] = useState<SunatStatus | null>(null);
  const [sunatDocuments, setSunatDocuments] = useState<SunatDocument[]>([]);
  const [sunatDocumentsPagination, setSunatDocumentsPagination] = useState<PaginationMeta | undefined>();
  const [sunatDocumentsPage, setSunatDocumentsPage] = useState(1);
  const [sunatSaleId, setSunatSaleId] = useState('');
  const [loadingSunat, setLoadingSunat] = useState(false);
  const [issuingSunat, setIssuingSunat] = useState(false);
  const [companyFormValues, setCompanyFormValues] = useState<CompanySettingsFormValues>({
    name: '',
    emailDomain: '',
    country: '',
    currency: '',
    timezone: '',
  });
  const { showToast } = useToast();
  const { user, refreshUser } = useAuth();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const canManageCompany = useMemo(() => {
    return ['owner', 'admin', 'superadmin'].includes(user?.role ?? profile?.role ?? '');
  }, [user?.role, profile?.role]);
  const canRunCriticalActions = useMemo(() => {
    return ['owner', 'superadmin'].includes(user?.role ?? profile?.role ?? '');
  }, [user?.role, profile?.role]);
  const isPeruCompany = useMemo(() => {
    return (profile?.company?.country ?? '').toUpperCase() === 'PE';
  }, [profile?.company?.country]);

  const loadProfile = useCallback(async () => {
    try {
      const response = await api.users.getProfile();
      if (response.success) {
        const loadedProfile = response.data as ProfileData;
        setProfile(loadedProfile);
        setCompanyFormValues({
          name: loadedProfile.company.name,
          emailDomain: loadedProfile.company.emailDomain,
          country: loadedProfile.company.country,
          currency: loadedProfile.company.currency,
          timezone: loadedProfile.company.timezone,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar perfil';
      showToast(message, 'error');
    }
  }, [showToast]);

  const loadCompanyUsers = useCallback(async (page = companyUsersPage) => {
    if (!canManageCompany) return;

    try {
      const response = await api.users.listCompanyUsers({ page, limit: companyUsersPageSize });
      if (response.success) {
        const paginated = response.data as PaginatedData<CompanyUser>;
        setCompanyUsers(paginated.items);
        setCompanyUsersPagination(paginated.meta);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar usuarios';
      showToast(message, 'error');
    }
  }, [canManageCompany, companyUsersPage, showToast]);

  const loadBillingPlans = useCallback(async () => {
    if (!canManageCompany) return;

    setLoadingBillingPlans(true);
    try {
      const response = await api.payments.listPlans();
      if (response.success) {
        const data = response.data as { currentPlan: string; plans: PlanOption[] };
        setBillingPlans(data.plans);
        setCurrentPlanId(data.currentPlan);
        const hasCurrentPlan = data.plans.some((plan) => plan.id === data.currentPlan);
        const fallbackPlanId = hasCurrentPlan ? data.currentPlan : data.plans[0]?.id || '';
        setSelectedPlanId((current) => {
          if (current && data.plans.some((plan) => plan.id === current)) {
            return current;
          }
          return fallbackPlanId;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar planes';
      showToast(message, 'error');
    } finally {
      setLoadingBillingPlans(false);
    }
  }, [canManageCompany, showToast]);

  const loadSunatStatus = useCallback(async () => {
    if (!canManageCompany || !isPeruCompany) return;

    try {
      const response = await api.peru.getSunatStatus();
      if (response.success) {
        setSunatStatus(response.data as SunatStatus);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar estado de SUNAT';
      showToast(message, 'error');
    }
  }, [canManageCompany, isPeruCompany, showToast]);

  const loadSunatDocuments = useCallback(async (page = 1) => {
    if (!canManageCompany || !isPeruCompany) return;

    setLoadingSunat(true);
    try {
      const response = await api.peru.listSunatDocuments({ page, limit: 10 });
      if (response.success) {
        const paginated = response.data as PaginatedData<SunatDocument>;
        setSunatDocuments(paginated.items);
        setSunatDocumentsPagination(paginated.meta);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar documentos SUNAT';
      showToast(message, 'error');
    } finally {
      setLoadingSunat(false);
    }
  }, [canManageCompany, isPeruCompany, showToast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadProfile();
      setLoading(false);
    };

    loadData();
  }, [loadProfile]);

  useEffect(() => {
    if (canManageCompany) {
      loadCompanyUsers();
    }
  }, [canManageCompany, companyUsersPage, loadCompanyUsers]);

  useEffect(() => {
    if (canManageCompany) {
      loadBillingPlans();
    }
  }, [canManageCompany, loadBillingPlans]);

  useEffect(() => {
    if (canManageCompany && isPeruCompany) {
      loadSunatStatus();
      loadSunatDocuments(sunatDocumentsPage);
    }
  }, [canManageCompany, isPeruCompany, sunatDocumentsPage, loadSunatStatus, loadSunatDocuments]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const strength = evaluatePassword(passwordData.newPassword);
    if (strength.score < 5) {
      showToast('La nueva contraseña no cumple la politica de seguridad', 'error');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await api.users.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (response.success) {
        showToast('Contraseña actualizada con exito', 'success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar contraseña';
      showToast(message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCompanyUpdate = async (values: CompanySettingsFormValues) => {
    if (!canManageCompany) {
      showToast('No tienes permisos para modificar la empresa', 'error');
      return;
    }

    const currentDomain = profile?.company?.emailDomain?.trim().toLowerCase() ?? '';
    const incomingDomain = values.emailDomain.trim().toLowerCase();
    const needsCriticalConfirmation = currentDomain !== incomingDomain;

    if (needsCriticalConfirmation) {
      if (!canRunCriticalActions) {
        showToast('Solo el administrador de la empresa puede cambiar el dominio', 'error');
        return;
      }
      setPendingAction({ type: 'domain-change', values });
      setIsCriticalModalOpen(true);
      return;
    }

    await executeCompanyUpdate(values);
  };

  const executeCompanyUpdate = async (
    values: CompanySettingsFormValues,
    criticalConfirmation?: { confirmAction: true; currentPassword: string }
  ) => {
    setSavingCompany(true);
    try {
      const response = await api.companies.updateCurrent({
        ...values,
        ...criticalConfirmation,
      });
      if (response.success) {
        showToast('Empresa actualizada correctamente. Si cambiaste el dominio, vuelve a iniciar sesion.', 'success');
        await loadProfile();
        await loadCompanyUsers();

        await refreshUser();
        return true;
      }
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar empresa';
      showToast(message, 'error');
      return false;
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreateUser = async (values: CreateWorkerFormValues) => {
    if (!canManageCompany) {
      showToast('No tienes permisos para crear usuarios', 'error');
      return false;
    }

    if (values.role === 'admin') {
      if (!canRunCriticalActions) {
        showToast('Solo el administrador de la empresa puede crear usuarios admin', 'error');
        return false;
      }
      setPendingAction({ type: 'create-admin', values });
      setIsCriticalModalOpen(true);
      return false;
    }

    return executeCreateUser(values);
  };

  const executeCreateUser = async (
    values: CreateWorkerFormValues,
    criticalConfirmation?: { confirmAction: true; currentPassword: string }
  ) => {
    setCreatingUser(true);
    try {
      const response = await api.users.createCompanyUser({
        ...values,
        ...criticalConfirmation,
      });
      if (response.success) {
        showToast('Usuario creado correctamente', 'success');
        setCompanyUsersPage(1);
        await loadCompanyUsers(1);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      showToast(message, 'error');
      return false;
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCloseCriticalModal = () => {
    if (savingCompany || creatingUser) return;
    setIsCriticalModalOpen(false);
    setPendingAction(null);
  };

  const handleConfirmCriticalAction = async (currentPassword: string) => {
    if (!pendingAction) return;

    const criticalConfirmation = {
      confirmAction: true as const,
      currentPassword,
    };

    if (pendingAction.type === 'domain-change') {
      const success = await executeCompanyUpdate(pendingAction.values, criticalConfirmation);
      if (success) {
        setIsCriticalModalOpen(false);
        setPendingAction(null);
      }
      return;
    }

    const success = await executeCreateUser(pendingAction.values, criticalConfirmation);
    if (success) {
      setIsCriticalModalOpen(false);
      setPendingAction(null);
    }
  };

  const handlePayPlan = async () => {
    if (!canRunCriticalActions) {
      showToast('Solo owner o superadmin pueden ejecutar pagos de plan', 'error');
      return;
    }

    if (!selectedPlanId) {
      showToast('Selecciona un plan para continuar', 'error');
      return;
    }

    if (!paymentPassword) {
      showToast('Ingresa tu contrasena actual para confirmar el pago', 'error');
      return;
    }

    setPayingPlan(true);
    try {
      const response = await api.payments.payPlan({
        planId: selectedPlanId,
        cycle: billingCycle,
        currentPassword: paymentPassword,
      });

      if (response.success) {
        showToast('Pago aplicado y plan actualizado correctamente', 'success');
        setPaymentPassword('');
        await Promise.all([loadProfile(), loadBillingPlans()]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar el pago del plan';
      showToast(message, 'error');
    } finally {
      setPayingPlan(false);
    }
  };

  const handleIssueSunatDocument = async () => {
    if (!isPeruCompany) {
      showToast('SUNAT solo esta disponible para empresas con pais PE', 'error');
      return;
    }

    if (!sunatSaleId.trim()) {
      showToast('Ingresa el ID de la venta a emitir', 'error');
      return;
    }

    setIssuingSunat(true);
    try {
      const response = await api.peru.issueSaleDocument(sunatSaleId.trim());
      if (response.success) {
        showToast('Comprobante SUNAT procesado correctamente', 'success');
        setSunatSaleId('');
        await Promise.all([loadSunatStatus(), loadSunatDocuments(1)]);
        setSunatDocumentsPage(1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo emitir comprobante SUNAT';
      showToast(message, 'error');
    } finally {
      setIssuingSunat(false);
    }
  };

  const criticalActionContent = useMemo(() => {
    if (!pendingAction) return null;

    if (pendingAction.type === 'domain-change') {
      return {
        title: 'Confirmar cambio de dominio',
        description:
          'Cambiar el dominio afectara los correos permitidos para todos los usuarios de su empresa. Confirma con tu contraseña actual.',
        actionLabel: 'Confirmar cambio',
      };
    }

    return {
      title: 'Confirmar creacion de admin',
      description:
        'Estas por crear un usuario con permisos administrativos. Confirma con tu contraseña actual para continuar.',
      actionLabel: 'Crear admin',
    };
  }, [pendingAction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-black font-heading">Configuracion</h1>
        <p className="text-gray-500">Gestiona la seguridad, tu empresa y los usuarios de tu empresa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="space-y-2">
          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-4 py-3 bg-purple-50 text-[#7c3aed] rounded-xl font-bold text-sm text-left">
              <User className="w-4 h-4" />
              Perfil del Usuario
            </button>
            <button className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium text-sm text-left transition-colors">
              <Building className="w-4 h-4" />
              Empresa y Dominio
            </button>
            <button className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium text-sm text-left transition-colors">
              <Users className="w-4 h-4" />
              Usuarios de la empresa
            </button>
          </nav>
        </div>

        <div className="md:col-span-2 space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#7c3aed]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-black">Informacion Personal</h3>
                <p className="text-xs text-gray-400 font-medium">Tus datos basicos de acceso</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Email</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-black">{profile?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Rol</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-black capitalize">{profile?.role}</span>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#7c3aed]">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-black">Datos de la Empresa</h3>
                <p className="text-xs text-gray-400 font-medium">Actualizar nombre y dominio de correos de la empresa</p>
              </div>
            </div>

            <CompanySettingsForm
              initialValues={companyFormValues}
              disabled={!canManageCompany}
              canEditEmailDomain={canRunCriticalActions}
              loading={savingCompany}
              onSubmit={handleCompanyUpdate}
              planLabel={profile?.company?.plan ?? ''}
            />
          </motion.section>

          {canManageCompany && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Facturacion y Plan</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Paga y actualiza el plan de tu empresa de forma segura.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {billingPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`text-left rounded-2xl border px-5 py-4 transition-all ${
                      selectedPlanId === plan.id
                        ? 'border-[#7c3aed] bg-purple-50/50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-black">{plan.name}</p>
                      {currentPlanId === plan.id && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Mensual: {plan.currency} {Number(plan.monthlyPrice).toFixed(2)}
                      <br />
                      Anual: {plan.currency} {Number(plan.yearlyPrice).toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Ciclo</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none"
                    disabled={!canRunCriticalActions || loadingBillingPlans || payingPlan}
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Confirmar con contrasena actual</label>
                  <input
                    type="password"
                    value={paymentPassword}
                    onChange={(e) => setPaymentPassword(e.target.value)}
                    placeholder="Contrasena actual del owner/superadmin"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none"
                    disabled={!canRunCriticalActions || loadingBillingPlans || payingPlan}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handlePayPlan}
                  disabled={!canRunCriticalActions || loadingBillingPlans || payingPlan || billingPlans.length === 0}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {payingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pagar plan
                </button>
              </div>
            </motion.section>
          )}

          {canManageCompany && isPeruCompany && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Facturacion Electronica SUNAT</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Disponible solo para empresas registradas en Peru (PE).
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Estado</p>
                  <p className="text-sm font-bold text-black mt-1">
                    {sunatStatus?.enabled ? 'Habilitado' : 'No habilitado'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Entorno: <span className="font-bold">{sunatStatus?.environment ?? '-'}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Proveedor: <span className="font-bold">{sunatStatus?.provider ?? 'SUNAT'}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  value={sunatSaleId}
                  onChange={(e) => setSunatSaleId(e.target.value)}
                  placeholder="ID de venta"
                  className="md:col-span-3 w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none"
                />
                <button
                  type="button"
                  onClick={handleIssueSunatDocument}
                  disabled={!canRunCriticalActions || issuingSunat}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all disabled:opacity-50"
                >
                  {issuingSunat ? <Loader2 className="w-4 h-4 animate-spin" /> : <ReceiptText className="w-4 h-4" />}
                  Emitir
                </button>
              </div>

              <div className="space-y-2">
                {loadingSunat && sunatDocuments.length === 0 ? (
                  <p className="text-sm text-gray-500">Cargando documentos SUNAT...</p>
                ) : sunatDocuments.length > 0 ? (
                  sunatDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-black">
                          {doc.series}-{doc.correlative}
                        </p>
                        <p className="text-xs text-gray-500">
                          Venta: {doc.saleId} | {new Date(doc.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-widest font-bold text-[#7c3aed]">{doc.documentType}</p>
                        <p className="text-xs text-gray-500">{doc.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No hay comprobantes SUNAT registrados.</p>
                )}
              </div>

              <PaginationControls
                meta={sunatDocumentsPagination}
                isLoading={loadingSunat}
                onPageChange={setSunatDocumentsPage}
              />
            </motion.section>
          )}

          {canManageCompany && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#7c3aed]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Usuarios de la empresa</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Se crean con el dominio @{profile?.company?.emailDomain}
                  </p>
                </div>
              </div>

              <CreateWorkerForm
                loading={creatingUser}
                canAssignAdmin={canRunCriticalActions}
                onSubmit={handleCreateUser}
              />

              <div className="space-y-2">
                {companyUsers.map((companyUser) => (
                  <div key={companyUser.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-black">{companyUser.email}</p>
                      <p className="text-xs text-gray-500">{new Date(companyUser.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold text-[#7c3aed]">{companyUser.role}</span>
                  </div>
                ))}
                {companyUsers.length === 0 && (
                  <p className="text-sm text-gray-500">No hay usuarios registrados para esta empresa.</p>
                )}
              </div>
              <PaginationControls
                meta={companyUsersPagination}
                isLoading={creatingUser}
                onPageChange={setCompanyUsersPage}
              />
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-black">Seguridad de Cuenta</h3>
                <p className="text-xs text-gray-400 font-medium">Actualiza tu contraseña de acceso</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Contraseña Actual</label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="********"
                    className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nueva Contraseña</label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Min. 8 caracteres"
                      className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                    />
                    <PasswordStrengthHint password={passwordData.newPassword} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Confirmar Contraseña</label>
                    <input
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="********"
                      className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </motion.section>
        </div>
      </div>

      {criticalActionContent && (
        <CriticalActionModal
          isOpen={isCriticalModalOpen}
          loading={savingCompany || creatingUser}
          title={criticalActionContent.title}
          description={criticalActionContent.description}
          actionLabel={criticalActionContent.actionLabel}
          onClose={handleCloseCriticalModal}
          onConfirm={handleConfirmCriticalAction}
        />
      )}
    </div>
  );
}
