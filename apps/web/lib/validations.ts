import { z } from 'zod';
import { PASSWORD_RULES } from './password-policy';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Email corporativo invalido'),
  password: z
    .string()
    .min(1, 'La contrasena es obligatoria')
    .min(8, 'La contrasena debe tener al menos 8 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(1, 'Ingresa tus nombres').min(2, 'Ingresa tus nombres'),
  email: z.string().min(1, 'El email es obligatorio').email('Email corporativo invalido'),
  phone: z
    .string()
    .min(1, 'El telefono es obligatorio')
    .min(7, 'Ingresa un telefono valido')
    .max(20, 'Telefono demasiado largo')
    .regex(/^[0-9+\-\s()]+$/, 'Telefono invalido'),
  password: z
    .string()
    .min(1, 'La contrasena es obligatoria')
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .refine(PASSWORD_RULES.uppercase, 'Debe contener al menos una mayuscula')
    .refine(PASSWORD_RULES.lowercase, 'Debe contener al menos una minuscula')
    .refine(PASSWORD_RULES.number, 'Debe contener al menos un numero')
    .refine(PASSWORD_RULES.symbol, 'Debe contener al menos un simbolo'),
  confirmPassword: z
    .string()
    .min(1, 'Confirma tu contrasena')
    .min(8, 'Confirma tu contrasena'),
  companyName: z
    .string()
    .min(1, 'El nombre del negocio es obligatorio')
    .min(2, 'El nombre del negocio es muy corto'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;
