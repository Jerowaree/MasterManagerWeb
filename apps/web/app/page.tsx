import { headers } from "next/headers";
import { resolveCountryVariant } from "@/lib/landing-config";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Pricing } from "@/components/landing/Pricing";
import { Features } from "@/components/landing/Features";

type LandingPageProps = {
  searchParams?: {
    country?: string;
  };
};

function detectCountryFromHeaders() {
  const requestHeaders = headers();
  // Vercel deployment header
  const ipCountry = requestHeaders.get("x-vercel-ip-country")?.toUpperCase();
  if (ipCountry) return ipCountry;

  // Browser language fallback
  const acceptedLanguage = requestHeaders.get("accept-language")?.toLowerCase() ?? "";
  
  // Si el lenguaje es español (es, es-PE, es-419), asumimos Perú como default para esta etapa
  if (acceptedLanguage.includes("es-pe") || 
      acceptedLanguage.includes("es-419") || 
      acceptedLanguage.startsWith("es")) {
    return "PE";
  }

  return "GLOBAL";
}

export default function LandingPage({ searchParams }: LandingPageProps) {
  const selectedCountry = searchParams?.country?.toUpperCase() ?? detectCountryFromHeaders();
  const variant = resolveCountryVariant(selectedCountry);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        <Hero />
        <Features />
        <Pricing variant={variant} />
      </main>

      <Footer />
    </div>
  );
}
