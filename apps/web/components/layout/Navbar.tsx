"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';
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
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled 
          ? "bg-white/80 backdrop-blur-md border-gray-100 py-3 shadow-sm" 
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-extrabold tracking-tighter transition-colors duration-300 uppercase">
            <span className={cn(scrolled ? "text-black" : "text-black")}>Master</span>
            <span className="text-[#7c3aed]">Manager</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm font-bold text-black hover:text-purple-600 transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link 
            href="/register" 
            className="px-5 py-2.5 bg-black text-white rounded-full text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2 transform active:scale-95 shadow-lg shadow-black/10"
          >
            Comenzar Gratis
            <ChevronRight className="w-4 h-4" />
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
            className="md:hidden bg-white border-b overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-semibold text-gray-900"
                >
                  {item.name}
                </Link>
              ))}
              <hr />
              <div className="flex flex-col gap-4 pt-2">
                <Link 
                  href="/login" 
                  className="text-center font-bold text-black"
                >
                  Iniciar Sesión
                </Link>
                <Link 
                  href="/register" 
                  className="w-full py-4 bg-purple-600 text-white rounded-xl text-center font-bold"
                >
                  Regístrate Gratis
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
