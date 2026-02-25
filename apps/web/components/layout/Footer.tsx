import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Twitter, Github, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-black text-gray-400 py-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand Column */}
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-extrabold tracking-tighter uppercase">
              <span className="text-white">Master</span>
              <span className="text-[#7c3aed]">Manager</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed max-w-xs">
            La plataforma líder en gestión empresarial multi-sucursal con seguridad de grado militar. Optimizada para el mercado latinoamericano.
          </p>
          <div className="flex gap-4">
            <Twitter className="w-5 h-5 hover:text-purple-500 cursor-pointer transition-colors" />
            <Github className="w-5 h-5 hover:text-purple-500 cursor-pointer transition-colors" />
            <Linkedin className="w-5 h-5 hover:text-purple-500 cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Links Columns */}
        <div>
          <h4 className="text-white font-bold mb-6">Producto</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link></li>
            <li><Link href="#pricing" className="hover:text-white transition-colors">Precios</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Seguridad</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">API Docs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6">Compañía</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="#" className="hover:text-white transition-colors">Sobre nosotros</Link></li>
            <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Privacidad</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Términos</Link></li>
          </ul>
        </div>

        {/* Contact Column */}
        <div className="space-y-4">
          <h4 className="text-white font-bold mb-6">Contacto</h4>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-purple-500" />
            <span>hola@mastermanager.com</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-purple-500" />
            <span>Lima, Perú / Remoto Global</span>
          </div>
          <div className="flex items-center gap-3 text-sm border-t border-white/5 pt-4">
            <ShieldCheck className="w-4 h-4 text-[green]" />
            <span className="text-[green] font-bold text-[10px] uppercase tracking-widest">Servidor 99.9% Uptime</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest font-bold">
        <p>© 2026 Master Manager. All rights reserved.</p>
        <p className="flex gap-4">
          <span>GDPR Compliant</span>
          <span>SSL Encryption</span>
          <span>SOC2 Type II</span>
        </p>
      </div>
    </footer>
  );
}
