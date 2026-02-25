import { z } from 'zod';
import { PASSWORD_RULES } from '@/lib/password-policy';

export const companySettingsSchema = z.object({
  name: z.string().min(2, 'El nombre comercial debe tener al menos 2 caracteres'),
  emailDomain: z
    .string()
    .min(4, 'El dominio es requerido')
    .regex(
      /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
      'Ingresa un dominio valido, por ejemplo pepito.com'
    ),
  country: z.string().min(2, 'Pais requerido').max(10, 'Pais invalido'),
  currency: z.string().min(2, 'Moneda requerida').max(10, 'Moneda invalida'),
  timezone: z.string().min(3, 'Zona horaria requerida').max(80, 'Zona horaria invalida'),
});

export const createWorkerSchema = z.object({
  username: z
    .string()
    .min(2, 'El usuario debe tener al menos 2 caracteres')
    .max(50, 'El usuario es demasiado largo')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo se permiten letras, numeros, punto, guion y guion bajo'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener minimo 8 caracteres')
    .refine(PASSWORD_RULES.uppercase, 'Debe incluir una mayuscula')
    .refine(PASSWORD_RULES.lowercase, 'Debe incluir una minuscula')
    .refine(PASSWORD_RULES.number, 'Debe incluir un numero')
    .refine(PASSWORD_RULES.symbol, 'Debe incluir un simbolo'),
  role: z.enum(['employee', 'admin']),
});

export type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;
export type CreateWorkerFormValues = z.infer<typeof createWorkerSchema>;
