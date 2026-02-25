"use client";

import React, { useEffect, useState } from 'react';
import { User, Shield, Building, Mail, MapPin, CreditCard, Lock, Save, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const { showToast } = useToast();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.users.getProfile();
        if (response.success) {
          setProfile(response.data);
        }
      } catch (err: any) {
        showToast(err.message || 'Error al cargar perfil', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [showToast]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
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
        showToast('Contraseña actualizada con éxito', 'success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar contraseña', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-black font-heading">Configuración</h1>
        <p className="text-gray-500">Gestiona tu información personal y la seguridad de tu cuenta.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Sidebar Nav */}
        <div className="space-y-2">
          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-4 py-3 bg-purple-50 text-[#7c3aed] rounded-xl font-bold text-sm text-left">
              <User className="w-4 h-4" />
              Perfil del Usuario
            </button>
            <button className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium text-sm text-left transition-colors">
              <Shield className="w-4 h-4" />
              Seguridad
            </button>
            <button className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium text-sm text-left transition-colors">
              <Building className="w-4 h-4" />
              Datos de Empresa
            </button>
          </nav>
        </div>

        {/* Form Content */}
        <div className="md:col-span-2 space-y-8">
          {/* User Data Section */}
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
                <h3 className="font-bold text-black">Información Personal</h3>
                <p className="text-xs text-gray-400 font-medium">Tus datos básicos de acceso</p>
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

          {/* Company Data Section */}
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
                <p className="text-xs text-gray-400 font-medium">Configuración global de tu negocio</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre Comercial</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-black">{profile?.company?.name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">País</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-black">{profile?.company?.country}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Moneda</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-black uppercase">{profile?.company?.currency}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Plan Actual</label>
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <span className="text-sm font-bold text-[#7c3aed] uppercase tracking-wider">{profile?.company?.plan}</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Change Password Section */}
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
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder="••••••••"
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
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="Min. 6 caracteres"
                      className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Confirmar Nueva Contraseña</label>
                    <input 
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="••••••••"
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
    </div>
  );
}
