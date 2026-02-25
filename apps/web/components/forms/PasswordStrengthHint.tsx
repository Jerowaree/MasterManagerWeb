"use client";

import { evaluatePassword } from '@/lib/password-policy';

type Props = {
  password: string;
  className?: string;
};

export function PasswordStrengthHint({ password, className }: Props) {
  const { checks } = evaluatePassword(password);

  return (
    <div className={className}>
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-sans">
        <p className={checks.minLength ? 'text-gray-500' : 'text-red-500'}>Minimo 8 caracteres</p>
        <p className={checks.uppercase ? 'text-gray-500' : 'text-red-500'}>Una mayuscula</p>
        <p className={checks.lowercase ? 'text-gray-500' : 'text-red-500'}>Una minuscula</p>
        <p className={checks.number ? 'text-gray-500' : 'text-red-500'}>Un numero</p>
        <p className={checks.symbol ? 'text-gray-500' : 'text-red-500'}>Un simbolo</p>
      </div>
    </div>
  );
}
