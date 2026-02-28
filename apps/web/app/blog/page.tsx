import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Clock, User, ChevronRight } from "lucide-react";
import Image from "next/image";

const posts = [
  {
    id: 1,
    title: "Cómo la gestión multi-sucursal puede escalar tu negocio",
    excerpt: "Descubre las estrategias clave para centralizar operaciones y maximizar beneficios en todas tus sedes.",
    date: "24 Feb, 2026",
    author: "Ing. David R.",
    category: "Estrategia",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 2,
    title: "Seguridad de datos: Por qué el aislamiento multi-tenant es vital",
    excerpt: "Análisis técnico sobre la arquitectura de seguridad que protege la información crítica de Master Manager.",
    date: "20 Feb, 2026",
    author: "Equipo de Seguridad",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 3,
    title: "Optimizando la cadena de suministro en el sector retail",
    excerpt: "Herramientas y procesos para que nunca te falte stock ni te sobre inventario muerto.",
    date: "15 Feb, 2026",
    author: "Consultora Senior",
    category: "Inventarios",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 4,
    title: "IA en la atención al cliente: El futuro del soporte",
    excerpt: "Cómo automatizar respuestas sin perder el toque humano que tus clientes valoran.",
    date: "10 Feb, 2026",
    author: "David G.",
    category: "Innovación",
    image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 5,
    title: "Marketing para SaaS: Cómo atraer tus primeros 100 clientes",
    excerpt: "Guía práctica sobre canales orgánicos y pagados para startups de software.",
    date: "05 Feb, 2026",
    author: "Marta S.",
    category: "Crecimiento",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 6,
    title: "Liderazgo remoto: Manteniendo la cultura en equipos distribuidos",
    excerpt: "Retos y soluciones para gestionar talento global desde cualquier lugar del mundo.",
    date: "01 Feb, 2026",
    author: "Álvaro P.",
    category: "Cultura",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800",
  },
];

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Blog de Master Manager</h1>
            <p className="text-gray-500 text-lg">
              Insights, estrategias y actualizaciones sobre gestión empresarial, tecnología y seguridad de datos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {posts.map((post) => (
              <article key={post.id} className="group cursor-pointer">
                <div className="relative h-64 overflow-hidden rounded-3xl mb-6">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 90vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-purple-600 uppercase tracking-widest border border-purple-100 italic">
                      {post.category}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-medium uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 italic"><Clock className="w-3 h-3" /> {post.date}</span>
                    <span className="flex items-center gap-1.5 italic"><User className="w-3 h-3" /> {post.author}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold leading-tight group-hover:text-purple-600 transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-500 leading-relaxed italic">
                    {post.excerpt}
                  </p>
                  
                  <div className="pt-2 flex items-center gap-2 text-black font-bold text-sm uppercase tracking-widest border-b-2 border-black w-fit group-hover:gap-4 transition-all italic">
                    Leer artículo 
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
