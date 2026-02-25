import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email corporativo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Email corporativo inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un símbolo"),
  companyName: z.string().min(2, "El nombre de la empresa es muy corto"),
  country: z.enum(["PE", "US", "CL", "CO"]),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
