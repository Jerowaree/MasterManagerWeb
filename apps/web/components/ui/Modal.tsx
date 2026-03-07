"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Estado para asegurarnos de que solo renderice el portal en el cliente (evita errores de hidratación en Next.js)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Si no estamos en el cliente aún, no renderizamos nada
  if (!mounted) return null;

  // Usamos createPortal para "sacar" el modal de la jerarquía de componentes que lo atrapa
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          {/* Overlay oscuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm"
          />
          
          {/* Contenedor Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 dark:bg-[#0f0a1e]/90 dark:backdrop-blur-2xl dark:border-white/10 dark:shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 md:px-8 py-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-white/5">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
              <button 
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="p-6 md:p-8 overflow-y-auto no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body // <-- El portal lo inyecta directo en el body
  );
}