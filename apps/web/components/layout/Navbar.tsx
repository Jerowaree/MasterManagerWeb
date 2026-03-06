"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Funcionalidades', href: '/#features' },
  { name: 'Precios', href: '/#pricing' },
  { name: 'Contacto', href: '/contacto' },
  { name: 'Blog', href: '/blog' },
  { name: 'Soporte', href: '/soporte' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled 
          ? "bg-white/80 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm" 
          : "bg-transparent border-transparent py-6"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative z-10">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-extrabold tracking-tighter transition-colors duration-300 uppercase">
            <span className="text-black">Master</span>
            <span className="text-[#7c3aed]">Manager</span>
          </span>
        </Link>

        {/* Desktop Navigation - Con efecto de línea */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className="relative text-sm font-medium text-gray-600 hover:text-[#7c3aed] transition-colors group"
            >
              {item.name}
              {/* Línea animada al pasar el cursor */}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#7c3aed] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          
          {/* Botón Iniciar Sesión (Estilo borde gradiente Pill) */}
          <Link 
            href="/login" 
            className="group relative p-[1.5px] rounded-full transition-transform active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed] via-blue-400 to-cyan-400 rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative px-6 py-2 bg-white rounded-full flex items-center gap-2 transition-colors">
              <User className="w-4 h-4 text-[#7c3aed]" />
              <span className="text-sm font-bold text-gray-700">Iniciar Sesión</span>
            </div>
          </Link>

          {/* Botón Comenzar Gratis (Sólido gradiente Morado con Icono) */}
          <Link 
            href="/register" 
            className="group px-7 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white rounded-full text-sm font-bold hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all flex items-center gap-2 transform active:scale-95"
          >
            <span>Comenzar Gratis</span>
            <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
          </Link>

        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-black"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="md:hidden bg-white border-b overflow-hidden shadow-xl"
          >
            <div className="p-6 space-y-4">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-semibold text-gray-900 hover:text-[#7c3aed] transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              <hr />
              <div className="flex flex-col gap-4 pt-2">
                <Link 
                  href="/login" 
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-full font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                   <User className="w-5 h-5 text-[#7c3aed]" />
                   Iniciar Sesión
                </Link>
                <Link 
                  href="/register" 
                  className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white rounded-full text-center font-bold shadow-lg"
                >
                  Comenzar Gratis
                  <Rocket className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}