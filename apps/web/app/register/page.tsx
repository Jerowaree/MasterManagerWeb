"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Building, 
  Globe, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const passwordRequirements = [
  { id: 'min', label: 'Mínimo 8 caracteres', test: (pw: string) => pw.length >= 8 },
  { id: 'upper', label: 'Una mayúscula', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'Una minúscula', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'num', label: 'Un número', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'sym', label: 'Un símbolo', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

const steps = [
  { id: 'auth', title: 'Cuenta', icon: Lock, fields: ['email', 'password'] },
  { id: 'company', title: 'Empresa', icon: Building, fields: ['companyName', 'country'] },
  { id: 'finish', title: 'Listo', icon: CheckCircle2, fields: [] },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: 'PE' }
  });

  const passwordValue = watch('password', '');

  const handleNext = async () => {
    const activeFields = steps[currentStep].fields;
    const isValid = await trigger(activeFields as any);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerError(null);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, currency: data.country === 'PE' ? 'PEN' : 'USD' })
      });

      if (response.ok) {
        const result = await response.json();
        if (result?.data?.id) login(result.data);
        showToast('¡Cuenta creada!', 'success');
        setSuccess(true);
        setTimeout(() => window.location.href = '/dashboard', 3000);
      } else {
        const error = await response.json();
        setServerError(error.message);
      }
    } catch (err) {
      setServerError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#0f0a1e] text-white flex flex-col md:flex-row relative overflow-hidden">
      {/* --- EL DESTELLO DE LUZ (Glow Efect) --- */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Panel Izquierdo */}
      <div className="hidden md:flex md:w-1/2 p-12 lg:p-16 flex-col justify-center relative z-10">
        <div className="flex items-center gap-2 mb-10">
          <span className="text-xl font-extrabold tracking-tighter uppercase">Master<span className="text-purple-500">Manager</span></span>
        </div>
        
        <div className="space-y-4 lg:space-y-6">
          <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
            Tu plataforma <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">de gestión completa</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            Descubre el poder de la automatización empresarial con seguridad de nivel bancario.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-lg mt-16 lg:mt-20">
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm flex items-start gap-4">
            <Zap className="text-purple-400 w-6 h-6 mt-0.5" />
            <div><div className="text-white font-semibold">Rápido</div><div className="text-gray-500 text-sm">Optimizado para velocidad.</div></div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm flex items-start gap-4">
            <Clock className="text-purple-400 w-6 h-6 mt-0.5" />
            <div><div className="text-white font-semibold">15 Días Gratis</div><div className="text-gray-500 text-sm">Sin compromiso.</div></div>
          </div>
        </div>
      </div>

      {/* Panel Derecho (Formulario) */}
      <div className="flex-1 flex flex-col p-4 md:p-12 lg:p-20 justify-center relative z-10">
        <div className="max-w-md w-full mx-auto space-y-6 bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold">Crear nueva cuenta</h2>
             <Link href="/" className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div key="auth" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Email Corporativo</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                      <input {...register('email')} type="email" className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="tu@empresa.com" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Contraseña</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                      <input {...register('password')} type="password" className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="••••••••••••" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-x-2 mt-8 px-1">
                      <div className="space-y-1.5">
                        {[0, 1].map(i => (
                          <p key={passwordRequirements[i].id} className={cn("text-[10px] transition-colors font-medium", passwordRequirements[i].test(passwordValue) ? "text-gray-500" : "text-purple-500")}>
                            {passwordRequirements[i].label}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {[2, 3].map(i => (
                          <p key={passwordRequirements[i].id} className={cn("text-[10px] transition-colors font-medium", passwordRequirements[i].test(passwordValue) ? "text-gray-500" : "text-purple-500")}>
                            {passwordRequirements[i].label}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {[4].map(i => (
                          <p key={passwordRequirements[i].id} className={cn("text-[10px] transition-colors font-medium", passwordRequirements[i].test(passwordValue) ? "text-gray-500" : "text-purple-500")}>
                            {passwordRequirements[i].label}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div key="company" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Nombre de la Empresa</label>
                    <div className="relative group">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400" />
                      <input {...register('companyName')} className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="Razón Social" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">País de Operación</label>
                    <select {...register('country')} className="w-full px-4 py-3 bg-[#1a142e] border border-white/10 rounded-xl outline-none text-sm appearance-none cursor-pointer">
                      <option value="PE">Perú (PEN)</option>
                      <option value="US">USA (USD)</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 pt-6">
              {currentStep > 0 && (
                <button type="button" onClick={handleBack} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl font-bold text-xs hover:bg-white/10 transition-colors">Atrás</button>
              )}
              {/* --- BOTÓN UNIFICADO A MORADO --- */}
              <button
                type={currentStep < steps.length - 1 ? "button" : "submit"}
                onClick={currentStep < steps.length - 1 ? handleNext : undefined}
                disabled={loading}
                className={cn(
                  "flex-[2] py-3.5 rounded-xl font-bold transition-all text-xs transform active:scale-95 bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-900/20"
                )}
              >
                {loading ? "Cargando..." : currentStep < steps.length - 1 ? "Continuar" : "Finalizar Registro"}
              </button>
            </div>
          </form>
          <p className="text-center text-[11px] text-gray-500">¿Ya tienes cuenta? <Link href="/login" className="text-purple-400 font-bold hover:underline">Inicia sesión</Link></p>
        </div>
      </div>
    </div>
  );
}