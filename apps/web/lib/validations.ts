import { z } from 'zod';
import { PASSWORD_RULES } from './password-policy';

export const loginSchema = z.object({
  email: z.string().email('Email corporativo invalido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Email corporativo invalido'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .refine(PASSWORD_RULES.uppercase, 'Debe contener al menos una mayuscula')
    .refine(PASSWORD_RULES.lowercase, 'Debe contener al menos una minuscula')
    .refine(PASSWORD_RULES.number, 'Debe contener al menos un numero')
    .refine(PASSWORD_RULES.symbol, 'Debe contener al menos un simbolo'),
  companyName: z.string().min(2, 'El nombre de la empresa es muy corto'),
  country: z.enum(['PE', 'US', 'CL', 'CO']),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
