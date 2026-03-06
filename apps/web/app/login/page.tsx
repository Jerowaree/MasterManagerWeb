"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail,
  Lock,
  ChevronRight,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const target = `${name}=`;
  const found = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));
  return found ? decodeURIComponent(found.slice(target.length)) : null;
}

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
      const csrfToken = getCookie('csrf_token');
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
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
    <div className="h-screen bg-[#0f0a1e] text-white flex flex-col md:flex-row relative overflow-hidden">
      {/* Fondo con resplandor púrpura (Igual al Registro) */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Panel Izquierdo - Informativo */}
      <div className="hidden md:flex md:w-1/2 p-12 lg:p-16 flex-col justify-center relative z-10">
        <div className="flex items-center gap-2 mb-8 lg:mb-10">
          <span className="text-xl font-extrabold tracking-tighter uppercase">
            Master<span className="text-purple-500">Manager</span>
          </span>
        </div>
        
        <div className="space-y-4 lg:space-y-6">
          <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
            Accede a tu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">panel de control</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            Gestiona tus activos y procesos con la seguridad y velocidad que tu empresa necesita.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-lg mt-16 lg:mt-20">
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm flex items-start gap-4">
            <ShieldCheck className="text-purple-400 w-6 h-6 mt-0.5" />
            <div>
              <div className="text-white font-semibold">Seguro</div>
              <div className="text-gray-500 text-sm">Protección de nivel bancario.</div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm flex items-start gap-4">
            <Users className="text-purple-400 w-6 h-6 mt-0.5" />
            <div>
              <div className="text-white font-semibold">Multiusuario</div>
              <div className="text-gray-500 text-sm">Colaboración en tiempo real.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="flex-1 flex flex-col p-4 md:p-12 lg:p-20 justify-center relative z-10">
        <div className="max-w-md w-full mx-auto space-y-6 bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 backdrop-blur-2xl">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-bold">Bienvenido de vuelta</h2>
                <p className="text-gray-400 text-xs">Ingresa tus credenciales para continuar.</p>
             </div>
             <Link href="/" className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
             </Link>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Email Corporativo</label>
              <div className="relative group">
                <Mail className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                  errors.email ? "text-red-400" : "text-gray-500 group-focus-within:text-purple-400"
                )} />
                <input 
                  {...register('email')} 
                  type="email" 
                  className={cn(
                    "w-full pl-11 pr-4 py-3 bg-white/5 border rounded-xl outline-none text-sm transition-all",
                    errors.email ? "border-red-500/50" : "border-white/10 focus:border-purple-500/50"
                  )} 
                  placeholder="tu@empresa.com" 
                />
              </div>
              {errors.email && <p className="text-[10px] text-red-400 pl-1">{errors.email.message}</p>}
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contraseña</label>
                <Link href="/forgot-password" className="text-[10px] text-purple-400 font-bold hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative group">
                <Lock className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                  errors.password ? "text-red-400" : "text-gray-500 group-focus-within:text-purple-400"
                )} />
                <input 
                  {...register('password')} 
                  type={showPassword ? "text" : "password"} 
                  className={cn(
                    "w-full pl-11 pr-12 py-3 bg-white/5 border rounded-xl outline-none text-sm transition-all",
                    errors.password ? "border-red-500/50" : "border-white/10 focus:border-purple-500/50"
                  )} 
                  placeholder="••••••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-400 pl-1">{errors.password.message}</p>}
            </div>

            {/* Alerta de Error del Servidor */}
            {serverError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {serverError}
              </motion.div>
            )}

            {/* Botón Submit */}
            <div className="pt-4">
              <button
                disabled={loading}
                type="submit"
                className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  "Iniciando sesión..."
                ) : (
                  <>
                    Iniciar Sesión Segura
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-[11px] text-gray-500">
            ¿No tienes cuenta? <Link href="/register" className="text-purple-400 font-bold hover:underline">Regístrate gratis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
