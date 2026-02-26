"use client";

import React from 'react';
import { PaginationMeta } from '@/lib/dashboard-types';

type PaginationControlsProps = {
  meta?: PaginationMeta;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ meta, isLoading = false, onPageChange }: PaginationControlsProps) {
  if (!meta || meta.totalPages <= 1) {
    return null;
  }

  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
      <p className="text-xs font-semibold text-gray-500">
        Mostrando {start}-{end} de {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!meta.hasPrevPage || isLoading}
          onClick={() => onPageChange(meta.page - 1)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-xs font-bold text-gray-500 px-1">
          Pagina {meta.page} de {meta.totalPages}
        </span>
        <button
          type="button"
          disabled={!meta.hasNextPage || isLoading}
          onClick={() => onPageChange(meta.page + 1)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
