"use client";

import React from 'react';
import { PaginationMeta } from '@/lib/dashboard-types';

type PaginationControlsProps = {
  meta?: PaginationMeta;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ meta, isLoading = false, onPageChange }: PaginationControlsProps) {
  // Si no hay datos o solo hay 1 página, retornamos null para que no quede la "caja vacía" al final
  if (!meta || meta.totalPages <= 1) {
    return null;
  }

  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 w-full">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Mostrando <span className="font-bold text-gray-800 dark:text-gray-200">{start}-{end}</span> de <span className="font-bold text-gray-800 dark:text-gray-200">{meta.total}</span>
      </p>
      
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!meta.hasPrevPage || isLoading}
          onClick={() => onPageChange(meta.page - 1)}
          className="px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          Anterior
        </button>
        
        <div className="px-3 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-800 dark:text-gray-200">{meta.page}</span> / {meta.totalPages}
        </div>
        
        <button
          type="button"
          disabled={!meta.hasNextPage || isLoading}
          onClick={() => onPageChange(meta.page + 1)}
          className="px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}