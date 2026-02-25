"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkerSchema, CreateWorkerFormValues } from './settings-validators';
import { Loader2, PlusCircle } from 'lucide-react';
import { PasswordStrengthHint } from '@/components/forms/PasswordStrengthHint';

type Props = {
  loading?: boolean;
  canAssignAdmin?: boolean;
  onSubmit: (values: CreateWorkerFormValues) => Promise<boolean | void> | boolean | void;
};

export function CreateWorkerForm({ loading, canAssignAdmin = false, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateWorkerFormValues>({
    resolver: zodResolver(createWorkerSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'employee',
    },
  });

  const submit = async (values: CreateWorkerFormValues) => {
    const shouldReset = await onSubmit(values);
    if (shouldReset === true) {
      reset({ username: '', password: '', role: 'employee' });
    }
  };
  const password = watch('password', '');

  return (
    <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div className="sm:col-span-2">
        <input
          type="text"
          {...register('username')}
          placeholder="Usuario (ej. juan)"
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none"
        />
        {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
      </div>

      <div>
        <select
          {...register('role')}
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none"
        >
          <option value="employee">Worker</option>
          {canAssignAdmin && <option value="admin">Admin</option>}
        </select>
        {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
      </div>

      <div>
        <input
          type="password"
          {...register('password')}
          placeholder="Contrasena"
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        {!errors.password && <PasswordStrengthHint password={password} className="mt-2" />}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="sm:col-span-4 flex items-center justify-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-xl font-bold hover:bg-[#6d28d9] disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
        Crear Usuario
      </button>
    </form>
  );
}
