"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type Props = {
  isOpen: boolean;
  loading?: boolean;
  title: string;
  description: string;
  actionLabel: string;
  onClose: () => void;
  onConfirm: (currentPassword: string) => Promise<void> | void;
};

export function CriticalActionModal({
  isOpen,
  loading,
  title,
  description,
  actionLabel,
  onClose,
  onConfirm,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword("");
      setError(null);
    }
  }, [isOpen]);

  const isConfirmDisabled = useMemo(() => {
    return loading || currentPassword.trim().length < 8;
  }, [currentPassword, loading]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPassword.trim().length < 8) {
      setError("Ingresa tu contrasena actual para confirmar.");
      return;
    }
    setError(null);
    await onConfirm(currentPassword);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleConfirm} className="space-y-5" role="dialog" aria-modal="true">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
          <p className="text-sm font-sans text-gray-700">{description}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="critical-current-password" className="text-xs font-black uppercase tracking-widest text-gray-400">
            Contrasena actual
          </label>
          <input
            id="critical-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="********"
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold outline-none transition-all focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
          />
          {error && <p className="text-xs font-sans text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-50 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isConfirmDisabled}
            className="flex items-center gap-2 rounded-2xl bg-black px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
