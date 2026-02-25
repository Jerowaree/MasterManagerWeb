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
  ShieldCheck,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import { PasswordStrengthHint } from '@/components/forms/PasswordStrengthHint';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  const [submissionStartedAt] = useState<number>(() => Date.now());
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country: 'PE',
    }
  });

  const handleNext = async () => {
    const activeFields = steps[currentStep].fields as any[];
    const isValid = await trigger(activeFields);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };
  const passwordValue = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          currency: data.country === 'PE' ? 'PEN' : 'USD',
          timezone: 'UTC',
          branchName: 'Sede Principal',
          website: '',
          submissionStartedAt,
        })
      });

      if (response.ok) {
        showToast('¡Cuenta creada exitosamente!', 'success');
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 3000);
      } else {
        const error = await response.json();
        const message = error.message || 'Error en el registro. Verifica los datos.';
        setServerError(message);
        showToast(message, 'error');
      }
    } catch (err) {
      setServerError('Error de conexión con el servidor seguro.');
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="w-fit px-8 py-4 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-purple-200">
            <span className="text-2xl font-extrabold tracking-tighter uppercase">
              <span className="text-white">Master</span>
              <span className="text-black">Manager</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">¡Bienvenido a Master Manager!</h1>
          <p className="text-gray-500 text-lg">
            Tu cuenta ha sido creada bajo protocolos de seguridad máxima. Tu prueba de 15 días ha comenzado.
          </p>
          <Link 
            href="/login" 
            className="inline-block w-full py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 transition-all transform active:scale-[0.98]"
          >
            Ir al Dashboard Seguro
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-black flex flex-col md:flex-row">
      {/* Left Decoration - Desktop Only */}
      <div className="hidden md:flex md:w-1/2 bg-black p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <span className="text-2xl font-extrabold tracking-tighter uppercase">
              <span className="text-white">Master</span>
              <span className="text-[#7c3aed]">Manager</span>
            </span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Gestión inteligente con <br />
            <span className="text-purple-500">seguridad militar.</span>
          </h1>
          <p className="text-gray-400 text-xl max-w-md">
            Tu información está protegida por encriptación avanzada y aislamiento multi-tenant estricto.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
            <Zap className="text-purple-500 mb-2" />
            <div className="text-white font-semibold">Rápido</div>
            <div className="text-gray-500 text-sm">Infraestructura optimizada</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
            <Clock className="text-purple-500 mb-2" />
            <div className="text-white font-semibold">15 Días Gratis</div>
            <div className="text-gray-500 text-sm">Sin compromiso</div>
          </div>
        </div>
      </div>

      {/* Right Content - Form */}
      <div className="flex-1 flex flex-col p-6 md:p-20 justify-center">
        <div className="max-w-md w-full mx-auto space-y-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors group w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver
          </Link>
          
          <div>
            <h2 className="text-3xl font-bold mb-2">Crear nueva cuenta</h2>
            <p className="text-gray-500">Únete a la plataforma empresarial más segura de la región.</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between py-4 border-b">
            {steps.map((step, idx) => (
              <div 
                key={step.id}
                className={cn(
                  "flex items-center gap-2 transition-opacity",
                  currentStep === idx ? "opacity-100" : "opacity-40"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  currentStep === idx ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
                )}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                {idx < steps.length - 1 && <div className="h-[1px] w-4 sm:w-10 bg-gray-200 ml-2" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div 
                  key="auth"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
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
                        autoComplete="email"
                        className={cn(
                          "w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none transition-all",
                          errors.email 
                            ? "border-red-500 focus:ring-red-500/10" 
                            : "border-gray-200 focus:ring-purple-600/10 focus:border-purple-600"
                        )}
                        placeholder="tu@empresa.com"
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-500 pl-1">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold pl-1">Contraseña</label>
                    <div className="relative group">
                      <Lock className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                        "text-gray-400 group-focus-within:text-purple-600"
                      )} />
                      <input 
                        {...register('password')}
                        type="password"
                        autoComplete="new-password"
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none transition-all focus:ring-purple-600/10 focus:border-purple-600"
                        placeholder="••••••••••••"
                      />
                    </div>
                    <PasswordStrengthHint password={passwordValue} className="pl-1" />
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div 
                  key="company"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-semibold pl-1">Nombre de la Empresa</label>
                    <div className="relative group">
                      <Building className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                        errors.companyName ? "text-red-500" : "text-gray-400 group-focus-within:text-purple-600"
                      )} />
                      <input 
                        {...register('companyName')}
                        type="text"
                        className={cn(
                          "w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none transition-all",
                          errors.companyName 
                            ? "border-red-500 focus:ring-red-500/10" 
                            : "border-gray-200 focus:ring-purple-600/10 focus:border-purple-600"
                        )}
                        placeholder="Razón Social o Nombre Fantasía"
                      />
                    </div>
                    {errors.companyName && <p className="text-xs text-red-500 pl-1">{errors.companyName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold pl-1">País de Operación</label>
                    <div className="relative group">
                      <Globe className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                        errors.country ? "text-red-500" : "text-gray-400 group-focus-within:text-purple-600"
                      )} />
                      <select 
                        {...register('country')}
                        className={cn(
                          "w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none transition-all appearance-none cursor-pointer",
                          errors.country 
                            ? "border-red-500 focus:ring-red-500/10" 
                            : "border-gray-200 focus:ring-purple-600/10 focus:border-purple-600"
                        )}
                      >
                        <option value="PE">Perú (Soles/PEN)</option>
                        <option value="US">Estados Unidos (USD)</option>
                        <option value="CL">Chile (CLP)</option>
                        <option value="CO">Colombia (COP)</option>
                      </select>
                    </div>
                    {errors.country && <p className="text-xs text-red-500 pl-1">{errors.country.message}</p>}
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div 
                  key="finish"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 text-center py-4"
                >
                  <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                    <Zap className="text-purple-600 w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Todo listo para despegar</h3>
                    <p className="text-gray-500">
                      Al hacer clic en finalizar, crearemos tu infraestructura aislada y activaremos tu periodo de prueba.
                    </p>
                  </div>
                  <div className="bg-purple-600/5 p-4 rounded-2xl border border-purple-600/10 text-left flex gap-3">
                    <ShieldCheck className="text-purple-600 shrink-0 mt-1" />
                    <div>
                      <div className="text-sm font-bold text-black uppercase tracking-wider text-[10px]">Protección Activa</div>
                      <p className="text-xs text-purple-900/60 leading-relaxed">
                        Tus datos se almacenan en servidores con redundancia geográfica y cumpliendo estándares SOC2.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

            <div className="flex gap-4 pt-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  Continuar
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Finalizar Registro
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta? <Link href="/login" className="text-purple-600 font-bold hover:underline">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
