"use client";

import { evaluatePassword } from '@/lib/password-policy';

type Props = {
  password: string;
  className?: string;
};

export function PasswordStrengthHint({ password, className }: Props) {
  const { checks, score, label, color } = evaluatePassword(password);
  const progress = `${Math.max(10, score * 20)}%`;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
        <span>Fortaleza</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: progress }} />
      </div>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <p className={checks.minLength ? 'text-emerald-600' : 'text-gray-400'}>Minimo 8 caracteres</p>
        <p className={checks.uppercase ? 'text-emerald-600' : 'text-gray-400'}>Una mayuscula</p>
        <p className={checks.lowercase ? 'text-emerald-600' : 'text-gray-400'}>Una minuscula</p>
        <p className={checks.number ? 'text-emerald-600' : 'text-gray-400'}>Un numero</p>
        <p className={checks.symbol ? 'text-emerald-600' : 'text-gray-400'}>Un simbolo</p>
      </div>
    </div>
  );
}
