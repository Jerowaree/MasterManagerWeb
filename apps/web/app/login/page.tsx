"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  ShieldCheck,
  ChevronRight,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/auth-context';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submissionStartedAt] = useState<number>(() => Date.now());
  const { showToast } = useToast();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          website: '',
          submissionStartedAt,
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result?.data?.id) {
          login(result.data);
        }
        showToast('¡Bienvenido de vuelta!', 'success');
        window.location.href = '/dashboard';
      } else {
        const error = await response.json();
        const message = error.message || 'Credenciales inválidas o acceso bloqueado por seguridad.';
        setServerError(message);
        showToast(message, 'error');
      }
    } catch (err) {
      setServerError('Error crítico de conexión con el servidor seguro.');
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col md:flex-row">
      {/* Right Content - Form (Swapped for variety and UX) */}
      <div className="flex-1 flex flex-col p-6 md:p-20 justify-center bg-[#fcfcfc]">
        <div className="max-w-md w-full mx-auto space-y-10">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors group w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver
          </Link>

          <div className="space-y-4">

            <div>
              <h2 className="text-3xl font-bold tracking-tight">Bienvenido de vuelta</h2>
              <p className="text-gray-500">Accede a tu terminal de gestión centralizada.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold pl-1">Email Corporativo</label>
                <div className="relative group">
                   <Mail className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    errors.email ? "text-red-500" : "text-gray-400 group-focus-within:text-purple-600"
                  )} />
                  <input 
                    {...register('email')}
                    type="email"
                    spellCheck={false}
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none transition-all",
                      errors.email 
                        ? "border-red-500 focus:ring-red-500/10" 
                        : "border-gray-200 focus:ring-purple-600/10 focus:border-purple-600"
                    )}
                    placeholder="nombre@empresa.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 pl-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-semibold">Contraseña</label>
                  <Link href="/forgot-password" title="Recuperar acceso" className="text-xs text-purple-600 font-bold hover:underline">¿Olvidaste tu contraseña?</Link>
                </div>
                <div className="relative group">
                  <Lock className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    errors.password ? "text-red-500" : "text-gray-400 group-focus-within:text-purple-600"
                  )} />
                  <input 
                    {...register('password')}
                    type={showPassword ? "text" : "password"}
                    className={cn(
                      "w-full pl-12 pr-12 py-4 bg-white border rounded-2xl outline-none transition-all",
                      errors.password
                        ? "border-red-500 focus:ring-red-500/10"
                        : "border-gray-200 focus:ring-purple-600/10 focus:border-purple-600"
                    )}
                    placeholder="••••••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 pl-1">{errors.password.message}</p>}
              </div>
            </div>

            {serverError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-800 text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                {serverError}
              </motion.div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-black/10"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Iniciar Sesión Segura
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            ¿No tienes una cuenta? <Link href="/register" className="text-purple-600 font-bold hover:underline">Regístrate gratis por 15 días</Link>
          </p>
        </div>
      </div>

      {/* Left Decoration - Security Banner */}
      <div className="hidden md:flex md:w-[45%] bg-purple-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[20%] right-[-20%] w-[80%] h-[80%] bg-black rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <span className="text-2xl font-extrabold tracking-tighter uppercase">
              <span className="text-white">Master</span>
              <span className="text-black">Manager</span>
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Tus activos, protegidos <br />
              por la élite.
            </h1>
            <div className="flex items-center gap-3 py-2 px-4 bg-black/20 backdrop-blur-md rounded-full w-fit border border-white/10">
              <Users className="text-white w-4 h-4" />
              <span className="text-white text-xs font-medium uppercase tracking-widest">+500 Empresas Confían en Nosotros</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Lock className="text-white w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold">Autenticación Dinámica</div>
              <p className="text-purple-100/60 text-sm">Sesiones protegidas con rotación de tokens y defensa contra CSRF.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

