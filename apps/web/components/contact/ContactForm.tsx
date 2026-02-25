"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const contactFormSchema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre completo."),
  email: z.string().email("Ingresa un correo valido."),
  company: z.string().min(2, "Ingresa el nombre de tu empresa."),
  reason: z.enum(["ventas", "soporte", "demo"], {
    required_error: "Selecciona el motivo del contacto.",
  }),
  message: z.string().min(20, "Describe tu solicitud con al menos 20 caracteres."),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      reason: "ventas",
    },
  });

  const reasonLabel = useMemo(
    () => ({
      ventas: "Consulta comercial",
      soporte: "Soporte tecnico",
      demo: "Solicitud de demo",
    }),
    []
  );

  const onSubmit = (data: ContactFormData) => {
    setSending(true);

    const subject = `${reasonLabel[data.reason]} - ${data.company}`;
    const body = [
      `Nombre: ${data.fullName}`,
      `Correo: ${data.email}`,
      `Empresa: ${data.company}`,
      `Motivo: ${reasonLabel[data.reason]}`,
      "",
      "Mensaje:",
      data.message,
    ].join("\n");

    const mailto = `mailto:hola@mastermanager.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    setSubmitted(true);
    setSending(false);
    reset();
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
      <h2 className="text-2xl font-bold text-slate-950">Formulario de contacto</h2>
      <p className="mt-2 text-sm text-slate-600">
        Completa los datos y abriremos tu cliente de correo con el mensaje listo para enviar.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-slate-900">
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            {...register("fullName")}
            aria-invalid={errors.fullName ? "true" : "false"}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
            placeholder="Ej: Ana Perez"
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-900">
              Correo corporativo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              aria-invalid={errors.email ? "true" : "false"}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              placeholder="tu@empresa.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-slate-900">
              Empresa
            </label>
            <input
              id="company"
              type="text"
              autoComplete="organization"
              {...register("company")}
              aria-invalid={errors.company ? "true" : "false"}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              placeholder="Nombre de tu empresa"
            />
            {errors.company && <p className="mt-1 text-xs text-red-600">{errors.company.message}</p>}
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-semibold text-slate-900">Motivo</legend>
          <select
            {...register("reason")}
            aria-invalid={errors.reason ? "true" : "false"}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
          >
            <option value="ventas">Consulta comercial</option>
            <option value="soporte">Soporte tecnico</option>
            <option value="demo">Solicitud de demo</option>
          </select>
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
        </fieldset>

        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-slate-900">
            Mensaje
          </label>
          <textarea
            id="message"
            rows={5}
            {...register("message")}
            aria-invalid={errors.message ? "true" : "false"}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
            placeholder="Cuentanos brevemente que necesitas."
          />
          {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {sending ? "Preparando correo..." : "Enviar solicitud"}
        </button>

        {submitted && (
          <p className="text-sm text-green-700">
            Formulario completado. Revisa tu cliente de correo para enviar el mensaje.
          </p>
        )}
      </form>
    </article>
  );
}
