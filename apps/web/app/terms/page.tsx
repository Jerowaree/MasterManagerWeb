import { headers } from "next/headers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Lock, ExternalLink, Globe } from "lucide-react";

function detectCountryFromHeaders() {
  const requestHeaders = headers();
  const ipCountry = requestHeaders.get("x-vercel-ip-country")?.toUpperCase();
  if (ipCountry) return ipCountry;

  const acceptedLanguage = requestHeaders.get("accept-language")?.toLowerCase() ?? "";
  if (acceptedLanguage.includes("es-pe") || acceptedLanguage.includes("es-419") || acceptedLanguage.startsWith("es")) {
    return "PE";
  }
  return "GLOBAL";
}

export default function TermsPage() {
  const country = detectCountryFromHeaders();
  const isPeru = country === "PE";
  const regionName = isPeru ? "Perú" : "Latinoamérica";

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
              <Shield className="text-purple-500 w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Términos y Condiciones</h1>
              <p className="text-gray-500 flex items-center gap-1.5 font-medium uppercase tracking-widest text-[10px]">
                <Globe className="w-3 h-3" /> Jurisdicción: {regionName}
              </p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-12 text-gray-600 leading-relaxed italic">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-black uppercase tracking-widest border-l-4 border-purple-600 pl-4 italic">1. Política de Privacidad y Manejo de Datos</h2>
              <p>
                En Master Manager, la privacidad de su información es nuestra prioridad más alta. Todos los datos ingresados en la plataforma, incluyendo información de inventario, ventas y datos de clientes, se encuentran bajo protocolos de aislamiento multi-tenant estricto.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Los datos son de propiedad exclusiva del usuario. Master Manager no comercializa ni accede a su información operativa.</li>
                <li>Implementamos encriptación AES-256 para datos en reposo y TLS 1.3 para datos en tránsito.</li>
                <li>La plataforma cumple con los estándares regionales de protección de datos personales de {regionName}.</li>
              </ul>
            </section>

            <section className="space-y-4 text-amber-900 bg-amber-50/50 p-8 rounded-3xl border border-amber-100">
              <h2 className="text-xl font-bold text-amber-950 flex items-center gap-2 uppercase tracking-widest italic">
                <ExternalLink className="w-5 h-5" /> Dependencia de Servicios Tercerizados
              </h2>
              <p>
                Master Manager utiliza infraestructura de clase mundial suministrada por proveedores terceros (como AWS, Google Cloud y Vercel). 
              </p>
              <p className="font-bold underline italic">
                IMPORTANTE: La disponibilidad del servicio de Master Manager está intrínsecamente ligada a la disponibilidad de estos proveedores de infraestructura. 
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Master Manager no se hace responsable por interrupciones de servicio originadas en fallas globales o regionales de proveedores de infraestructura tercerizados.</li>
                <li>En caso de caída de servicios externos, Master Manager activará protocolos de contingencia para restaurar la operación en el menor tiempo posible según los SLA de dichos proveedores.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-black uppercase tracking-widest border-l-4 border-purple-600 pl-4 italic">2. Reglas de Uso del Sistema</h2>
              <p>
                El acceso a Master Manager está restringido a empresas legalmente constituidas en {isPeru ? "el territorio de la República del Perú" : "la región de Latinoamérica"}. El usuario se compromete a:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>No utilizar la plataforma para fines ilícitos o fraudulentos.</li>
                <li>Mantener el secreto y la integridad de sus credenciales de acceso. Master Manager recomienda el uso de 2FA.</li>
                <li>Informar inmediatamente sobre cualquier vulnerabilidad detectada.</li>
              </ul>
            </section>

            <section className="space-y-4 bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <h2 className="text-xl font-bold text-black flex items-center gap-2 uppercase tracking-widest italic">
                <Lock className="w-5 h-5 text-purple-600" /> Seguridad y Vigilancia Anti-Fraude
              </h2>
              <p>
                Para garantizar la seguridad de todos nuestros clientes, el sistema Master Manager monitoriza continuamente patrones de tráfico para detectar intentos de fuerza bruta, ataques de inyección y comportamientos anómalos. Nos reservamos el derecho de suspender cuentas que representen un riesgo para la infraestructura colectiva.
              </p>
            </section>

            <div className="text-xs text-center pt-8 text-gray-400 font-bold uppercase tracking-widest italic">
              Última actualización: Febrero 2026 • Master Manager Legal Team
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
