"use client";

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  companySettingsSchema,
  CompanySettingsFormValues,
} from './settings-validators';
import { Loader2, Save } from 'lucide-react';

type Props = {
  initialValues: CompanySettingsFormValues;
  disabled?: boolean;
  canEditEmailDomain?: boolean;
  loading?: boolean;
  onSubmit: (values: CompanySettingsFormValues) => Promise<void> | void;
  planLabel: string;
};

export function CompanySettingsForm({
  initialValues,
  disabled,
  canEditEmailDomain = true,
  loading,
  onSubmit,
  planLabel,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: initialValues,
  });

  const watchedName = useWatch({ control, name: 'name' });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  useEffect(() => {
    if (watchedName) {
      const slug = watchedName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim() || 'empresa';
      const domain = `${slug}.com`;
      setValue('emailDomain', domain);
    }
  }, [watchedName, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre Comercial</label>
          <input
            type="text"
            {...register('name')}
            className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            disabled={disabled}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Dominio de Correos</label>
          <input
            type="text"
            {...register('emailDomain')}
            placeholder="pepito.com"
            className="w-full px-5 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm cursor-not-allowed"
            disabled={true}
          />
          {errors.emailDomain && <p className="text-xs text-red-500">{errors.emailDomain.message}</p>}
          <p className="text-xs text-gray-500">El dominio se genera automaticamente del nombre comercial.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Pais</label>
          <input
            type="text"
            {...register('country')}
            className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            disabled={disabled}
          />
          {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Moneda</label>
          <input
            type="text"
            {...register('currency')}
            className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            disabled={disabled}
          />
          {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Zona Horaria</label>
          <input
            type="text"
            {...register('timezone')}
            className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            disabled={disabled}
          />
          {errors.timezone && <p className="text-xs text-red-500">{errors.timezone.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-gray-400">Plan Actual</label>
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
          <span className="text-sm font-bold text-[#7c3aed] uppercase tracking-wider">{planLabel}</span>
        </div>
      </div>

      {!disabled && (
        <div className="pt-4 border-t border-gray-50 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Empresa
          </button>
        </div>
      )}
    </form>
  );
}
