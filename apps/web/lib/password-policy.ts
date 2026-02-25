export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = {
  minLength: (value: string) => value.length >= PASSWORD_MIN_LENGTH,
  uppercase: (value: string) => /[A-Z]/.test(value),
  lowercase: (value: string) => /[a-z]/.test(value),
  number: (value: string) => /[0-9]/.test(value),
  symbol: (value: string) => /[^A-Za-z0-9]/.test(value),
};

export function evaluatePassword(value: string) {
  const checks = {
    minLength: PASSWORD_RULES.minLength(value),
    uppercase: PASSWORD_RULES.uppercase(value),
    lowercase: PASSWORD_RULES.lowercase(value),
    number: PASSWORD_RULES.number(value),
    symbol: PASSWORD_RULES.symbol(value),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label = 'Muy debil';
  let color = 'bg-red-500';
  if (score >= 5) {
    label = 'Fuerte';
    color = 'bg-emerald-500';
  } else if (score >= 4) {
    label = 'Buena';
    color = 'bg-blue-500';
  } else if (score >= 3) {
    label = 'Media';
    color = 'bg-amber-500';
  }

  return { checks, score, label, color };
}
