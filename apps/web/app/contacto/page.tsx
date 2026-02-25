import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Mail, MessageSquare, LifeBuoy } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contacto | Master Manager",
  description:
    "Contacta al equipo de Master Manager para ventas, implementacion y soporte tecnico.",
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contacto Master Manager",
  description: "Canales de contacto comercial y soporte tecnico de Master Manager.",
  mainEntity: {
    "@type": "Organization",
    name: "Master Manager",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "hola@mastermanager.com",
        availableLanguage: ["es", "en"],
      },
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hola@mastermanager.com",
        availableLanguage: ["es", "en"],
      },
    ],
  },
};

export default function ContactoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow">
        <section aria-labelledby="contact-title" className="pt-28 pb-24 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <header className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-3 py-1.5">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Contacto
              </p>
              <h1 id="contact-title" className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
                Hablemos de tu implementacion.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Escribenos para una demo, activacion de plan o asistencia tecnica para tu operacion.
              </p>
            </header>

            <section
              aria-labelledby="contact-channels-title"
              className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start"
            >
              <h2 id="contact-channels-title" className="sr-only">
                Canales de contacto
              </h2>

              <div className="lg:col-span-3">
                <ContactForm />
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                <article className="rounded-3xl border border-slate-200 p-6 bg-slate-50">
                  <Mail className="w-6 h-6 text-purple-700" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">Correo</h3>
                  <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                    Envia tu consulta comercial o tecnica al canal oficial del equipo.
                  </p>
                  <a
                    href="mailto:hola@mastermanager.com"
                    className="inline-block mt-4 text-sm font-bold text-purple-700 underline underline-offset-4"
                  >
                    hola@mastermanager.com
                  </a>
                </article>

                <article className="rounded-3xl border border-slate-200 p-6 bg-slate-50">
                  <LifeBuoy className="w-6 h-6 text-purple-700" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">Soporte</h3>
                  <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                    Si ya eres cliente, revisa los canales y preguntas frecuentes de soporte.
                  </p>
                  <Link
                    href="/soporte"
                    className="inline-block mt-4 text-sm font-bold text-purple-700 underline underline-offset-4"
                  >
                    Ir a soporte
                  </Link>
                </article>

                <article className="rounded-3xl border border-slate-200 p-6 bg-slate-50">
                  <MessageSquare className="w-6 h-6 text-purple-700" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">Ventas</h3>
                  <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                    Coordinamos onboarding, migracion y plan segun tamano de tu negocio.
                  </p>
                  <a
                    href="mailto:hola@mastermanager.com?subject=Consulta%20comercial%20Master%20Manager"
                    className="inline-block mt-4 text-sm font-bold text-purple-700 underline underline-offset-4"
                  >
                    Solicitar demo
                  </a>
                </article>
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
      <Script
        id="contact-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
    </div>
  );
}
