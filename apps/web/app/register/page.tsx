"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  Mail,
  Lock,
  Building,
  Eye,
  EyeOff,
  ChevronDown,
  Search,
  Check,
  ArrowLeft,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import Image from 'next/image';

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

const passwordRequirements = [
  { id: 'min', label: 'Minimo 8 caracteres', test: (pw: string) => pw.length >= 8 },
  { id: 'upper', label: 'Una mayuscula', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'Una minuscula', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'num', label: 'Un numero', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'sym', label: 'Un simbolo', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

const steps = [
  { id: 'auth', fields: ['email', 'password', 'confirmPassword'] },
  { id: 'business', fields: ['fullName', 'phone', 'companyName'] },
] as const;

type RegistrationLocale = {
  country: 'PE' | 'US' | 'CL' | 'CO';
  currency: 'PEN' | 'USD' | 'CLP' | 'COP';
  timezone: string;
};

type CountryOption = {
  code: RegistrationLocale['country'];
  name: string;
  flagPath: string;
  dialCode: string;
  locale: RegistrationLocale;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: 'PE',
    name: 'Peru',
    flagPath: '/flags/pe.svg',
    dialCode: '+51',
    locale: { country: 'PE', currency: 'PEN', timezone: 'America/Lima' },
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    flagPath: '/flags/us.svg',
    dialCode: '+1',
    locale: { country: 'US', currency: 'USD', timezone: 'America/New_York' },
  },
  {
    code: 'CL',
    name: 'Chile',
    flagPath: '/flags/cl.svg',
    dialCode: '+56',
    locale: { country: 'CL', currency: 'CLP', timezone: 'America/Santiago' },
  },
  {
    code: 'CO',
    name: 'Colombia',
    flagPath: '/flags/co.svg',
    dialCode: '+57',
    locale: { country: 'CO', currency: 'COP', timezone: 'America/Bogota' },
  },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submissionStartedAt] = useState<number>(() => Date.now());
  const countryMenuRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      companyName: '',
    },
  });

  const passwordValue = watch('password', '');
  const confirmPasswordValue = watch('confirmPassword', '');
  const phoneValue = watch('phone', '');
  const canCheckPasswordMatch = passwordValue.length > 0 && confirmPasswordValue.length > 0;
  const passwordsMatch = canCheckPasswordMatch && passwordValue === confirmPasswordValue;
  const localPhoneValue = phoneValue
    .replace(new RegExp(`^\\${selectedCountry.dialCode}\\s*`), '')
    .replace(/^\+\d+\s*/, '');
  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((option) =>
      `${option.name} ${option.code} ${option.dialCode}`.toLowerCase().includes(query)
    );
  }, [countryQuery]);

  useEffect(() => {
    if (!getValues('phone')) {
      setValue('phone', `${selectedCountry.dialCode} `, { shouldValidate: false });
    }
  }, [getValues, selectedCountry.dialCode, setValue]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!countryMenuRef.current?.contains(event.target as Node)) {
        setIsCountryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCountrySelect = (option: CountryOption) => {
    const currentPhone = getValues('phone') ?? '';
    const currentLocalNumber = currentPhone
      .replace(new RegExp(`^\\${selectedCountry.dialCode}\\s*`), '')
      .replace(/^\+\d+\s*/, '');
    setSelectedCountry(option);
    setValue('phone', `${option.dialCode} ${currentLocalNumber}`.trim(), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setCountryQuery('');
    setIsCountryMenuOpen(false);
  };

  const handleNext = async () => {
    const activeFields = steps[currentStep].fields as RegisterFormData;
    const isValid = await trigger(activeFields);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep((value) => value + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((value) => value - 1);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerError(null);

    try {
      const { confirmPassword: _confirmPassword, ...registerData } = data;
      void _confirmPassword;
      const locale = selectedCountry.locale;
      const csrfToken = getCookie('csrf_token');

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...registerData,
          country: locale.country,
          currency: locale.currency,
          timezone: locale.timezone,
          website: '',
          submissionStartedAt,
        }),
      });

      if (response.ok) {
        await response.json();
        showToast('Cuenta creada', 'success');
        setShowSuccessModal(true);
        return;
      }

      const error = await response.json();
      const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
      setServerError(message ?? 'No se pudo completar el registro');
    } catch {
      setServerError('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#0f0a1e] text-white flex flex-col md:flex-row relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="hidden md:flex md:w-1/2 p-12 lg:p-16 flex-col justify-center relative z-10">
        <div className="flex items-center gap-2 mb-10">
          <span className="text-xl font-extrabold tracking-tighter uppercase">Master<span className="text-purple-500">Manager</span></span>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
            Tu plataforma <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">de gestion completa</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            Descubre el poder de la automatizacion empresarial con seguridad de nivel bancario.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-lg mt-16 lg:mt-20">
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm flex items-start gap-4">
            <Zap className="text-purple-400 w-6 h-6 mt-0.5" />
            <div><div className="text-white font-semibold">Rapido</div><div className="text-gray-500 text-sm">Optimizado para velocidad.</div></div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm flex items-start gap-4">
            <Clock className="text-purple-400 w-6 h-6 mt-0.5" />
            <div><div className="text-white font-semibold">15 Dias Gratis</div><div className="text-gray-500 text-sm">Sin compromiso.</div></div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 md:p-12 lg:p-20 justify-center relative z-10">
        <div className="max-w-md w-full mx-auto space-y-6 bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Crear nueva cuenta</h2>
            <Link href="/" className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              if (currentStep >= steps.length - 1) return;
              event.preventDefault();
              void handleNext();
            }}
            className="space-y-4"
          >
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div key="auth" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                      <input {...register('email')} type="email" className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="tu@empresa.com" />
                    </div>
                    {errors.email && <p className="text-[10px] text-red-400 pl-1">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Contrasena</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                      <input {...register('password')} type={showPassword ? 'text' : 'password'} className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="••••••••••••" />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-[10px] text-red-400 pl-1">{errors.password.message}</p>}

                    <div className="grid grid-cols-3 gap-x-2 mt-8 px-1">
                      <div className="space-y-1.5">
                        {[0, 1].map((i) => (
                          <p key={passwordRequirements[i].id} className={cn('text-[10px] transition-colors font-medium', passwordRequirements[i].test(passwordValue) ? 'text-gray-500' : 'text-purple-500')}>
                            {passwordRequirements[i].label}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {[2, 3].map((i) => (
                          <p key={passwordRequirements[i].id} className={cn('text-[10px] transition-colors font-medium', passwordRequirements[i].test(passwordValue) ? 'text-gray-500' : 'text-purple-500')}>
                            {passwordRequirements[i].label}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {[4].map((i) => (
                          <p key={passwordRequirements[i].id} className={cn('text-[10px] transition-colors font-medium', passwordRequirements[i].test(passwordValue) ? 'text-gray-500' : 'text-purple-500')}>
                            {passwordRequirements[i].label}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Confirmar Contrasena</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                      <input {...register('confirmPassword')} type={showConfirmPassword ? 'text' : 'password'} className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="Repite tu contrasena" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        aria-label={showConfirmPassword ? 'Ocultar confirmacion de contrasena' : 'Mostrar confirmacion de contrasena'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-[10px] text-red-400 pl-1">{errors.confirmPassword.message}</p>}
                    {canCheckPasswordMatch && (
                      <p className={cn('text-[10px] pl-1 font-medium', passwordsMatch ? 'text-emerald-400' : 'text-red-400')}>
                        {passwordsMatch ? 'Las contrasenas coinciden' : 'Las contrasenas no coinciden'}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div key="business" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Nombres</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                      <input {...register('fullName')} type="text" className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="Tus nombres completos" />
                    </div>
                    {errors.fullName && <p className="text-[10px] text-red-400 pl-1">{errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Celular</label>
                    <input type="hidden" {...register('phone')} />
                    <div ref={countryMenuRef} className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCountryMenuOpen((value) => !value)}
                        className="h-[46px] px-3 bg-white/5 border border-white/10 rounded-xl text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                        aria-label="Seleccionar pais"
                      >
                        <Image src={selectedCountry.flagPath} alt={selectedCountry.name} width={18} height={12} className="rounded-sm border border-white/20" />
                        <span className="text-xs font-semibold text-gray-200">{selectedCountry.dialCode}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      <div className="relative flex-1 group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <input
                          type="tel"
                          value={localPhoneValue}
                          onChange={(event) => {
                            const sanitized = event.target.value.replace(/[^0-9\s()-]/g, '');
                            setValue('phone', `${selectedCountry.dialCode} ${sanitized}`.trim(), {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.ctrlKey || event.metaKey || event.altKey) return;
                            const allowedKeys = new Set([
                              'Backspace',
                              'Delete',
                              'ArrowLeft',
                              'ArrowRight',
                              'Tab',
                              'Home',
                              'End',
                            ]);
                            if (allowedKeys.has(event.key)) return;
                            if (!/[0-9()\s-]/.test(event.key)) {
                              event.preventDefault();
                            }
                          }}
                          className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm"
                          placeholder="999 999 999"
                        />
                      </div>

                      {isCountryMenuOpen && (
                        <div className="absolute top-[52px] left-0 z-30 w-[260px] bg-[#1a142e] border border-white/10 rounded-xl shadow-2xl p-2">
                          <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              type="text"
                              value={countryQuery}
                              onChange={(event) => setCountryQuery(event.target.value)}
                              placeholder="Buscar pais o codigo"
                              className="w-full pl-8 pr-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs outline-none focus:border-purple-500/50"
                            />
                          </div>
                          <div className="max-h-44 overflow-auto space-y-1">
                            {filteredCountries.map((option) => (
                              <button
                                key={option.code}
                                type="button"
                                onClick={() => handleCountrySelect(option)}
                                className="w-full px-2 py-2 rounded-lg hover:bg-white/10 text-left text-xs flex items-center gap-2"
                              >
                                <Image src={option.flagPath} alt={option.name} width={18} height={12} className="rounded-sm border border-white/20" />
                                <span className="text-gray-100">{option.name}</span>
                                <span className="text-gray-400 ml-auto">{option.dialCode}</span>
                                {selectedCountry.code === option.code && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.phone && <p className="text-[10px] text-red-400 pl-1">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase tracking-wider">Nombre del Negocio</label>
                    <div className="relative group">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400" />
                      <input {...register('companyName')} className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 text-sm" placeholder="Razon Social" />
                    </div>
                    {errors.companyName && <p className="text-[10px] text-red-400 pl-1">{errors.companyName.message}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {serverError}
              </motion.div>
            )}

            <div className="flex gap-3 pt-6">
              {currentStep > 0 && (
                <button type="button" onClick={handleBack} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl font-bold text-xs hover:bg-white/10 transition-colors">Atras</button>
              )}
              <button
                type={currentStep < steps.length - 1 ? 'button' : 'submit'}
                onClick={currentStep < steps.length - 1 ? handleNext : undefined}
                disabled={loading}
                className="flex-[2] py-3.5 rounded-xl font-bold transition-all text-xs transform active:scale-95 bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-900/20"
              >
                {loading ? 'Cargando...' : currentStep < steps.length - 1 ? 'Continuar' : 'Finalizar Registro'}
              </button>
            </div>
          </form>

          <p className="text-center text-[11px] text-gray-500">Ya tienes cuenta? <Link href="/login" className="text-purple-400 font-bold hover:underline">Inicia sesion</Link></p>
        </div>
      </div>

      {showSuccessModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a142e] p-6 shadow-2xl"
          >
            <div className="mx-auto mb-4 relative h-16 w-16">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <motion.path
                    d="M5 12l4 4 10-10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.35, ease: 'easeOut' }}
                  />
                </svg>
              </motion.div>
            </div>

            <h3 className="text-lg font-bold text-white text-center">Registro exitoso</h3>
            <p className="mt-2 text-sm text-gray-300 text-center">
              Tu cuenta fue creada correctamente. Continúa para iniciar sesión.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                window.location.href = '/login';
              }}
              className="mt-5 w-full py-3 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              Continuar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

