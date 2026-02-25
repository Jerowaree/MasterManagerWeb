import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Clock3, LifeBuoy, Mail, MessageSquareText } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Soporte | Master Manager",
  description:
    "Canales de soporte tecnico y comercial de Master Manager: ayuda, contacto y preguntas frecuentes.",
};

const supportChannels = [
  {
    title: "Centro de ayuda",
    description:
      "Guias practicas para configurar cuentas, permisos, inventario, ventas y reportes.",
    cta: "Ver ayuda",
    href: "/blog",
    icon: LifeBuoy,
  },
  {
    title: "Soporte comercial",
    description:
      "Atencion para planes, implementacion y onboarding de equipos multi-sucursal.",
    cta: "Hablar con ventas",
    href: "/contacto",
    icon: MessageSquareText,
  },
  {
    title: "Soporte por correo",
    description:
      "Consultas tecnicas sobre integraciones, incidencias y funcionamiento de modulos.",
    cta: "Ir a contacto",
    href: "/contacto",
    icon: Mail,
  },
];

const faqs = [
  {
    question: "Como solicito soporte tecnico para mi cuenta?",
    answer:
      "Desde la pagina de contacto puedes enviar el detalle de tu caso y el equipo de soporte te responde por correo.",
  },
  {
    question: "Que horario de atencion tiene el soporte?",
    answer:
      "La atencion operativa se organiza por prioridad y zona horaria. El equipo confirma tiempos de respuesta en el primer contacto.",
  },
  {
    question: "Pueden ayudarme en la implementacion inicial?",
    answer:
      "Si. El equipo comercial coordina onboarding, configuracion y acompanamiento segun el plan contratado.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function SoportePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow">
        <section
          aria-labelledby="support-title"
          className="pt-28 pb-24 bg-slate-50 border-y border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-6 space-y-14">
            <header className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-3 py-1.5">
                <Clock3 className="w-3.5 h-3.5" aria-hidden="true" />
                Soporte y acompanamiento
              </p>
              <h1 id="support-title" className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
                Soporte para mantener tu operacion estable.
              </h1>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl">
                Accede a canales de ayuda, acompanamiento comercial y respuestas rapidas para incidentes y configuraciones.
              </p>
            </header>

            <section aria-labelledby="canales-soporte" className="space-y-6">
              <h2 id="canales-soporte" className="text-2xl font-bold text-slate-950">
                Canales de soporte
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {supportChannels.map((channel) => (
                  <article key={channel.title} className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                    <channel.icon className="w-6 h-6 text-purple-600" aria-hidden="true" />
                    <h3 className="mt-4 text-xl font-semibold text-slate-950">{channel.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{channel.description}</p>
                    <Link
                      href={channel.href}
                      className="inline-block mt-5 text-sm font-bold text-purple-700 hover:text-purple-800 underline underline-offset-4"
                    >
                      {channel.cta}
                    </Link>
                  </article>
                ))}
              </div>
            </section>

            <article aria-labelledby="support-faq-title" className="rounded-3xl border border-slate-200 bg-white p-8">
              <h2 id="support-faq-title" className="text-2xl font-bold text-slate-950">
                Preguntas frecuentes
              </h2>
              <dl className="mt-6 space-y-6">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <dt className="font-semibold text-slate-900">{faq.question}</dt>
                    <dd className="mt-2 text-slate-600">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>
        </section>
      </main>
      <Footer />
      <Script
        id="support-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
