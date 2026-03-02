"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Clock, Globe, Save, Loader2, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Branch, PaginationMeta, PaginatedData } from '@/lib/dashboard-types';

type AddressSuggestion = {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
};

type BranchFormData = {
  name: string;
  timezone: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export default function SucursalesPage() {
  const branchesPageSize = 9;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesPagination, setBranchesPagination] = useState<PaginationMeta | undefined>();
  const [branchesPage, setBranchesPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<BranchFormData>({
    name: '',
    timezone: 'America/Lima',
    address: '',
    latitude: undefined,
    longitude: undefined,
  });

  const canSearchAddress = useMemo(
    () => isModalOpen && formData.address.trim().length >= 3,
    [isModalOpen, formData.address]
  );

  const loadBranches = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const response = await api.branches.findAll({ page, limit: branchesPageSize });
      if (response.success) {
        const paginated = response.data as PaginatedData<Branch>;
        setBranches(paginated.items);
        setBranchesPagination(paginated.meta);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al cargar sucursales', 'error');
    } finally {
      setLoading(false);
    }
  }, [branchesPageSize, showToast]);

  useEffect(() => {
    loadBranches(branchesPage);
  }, [branchesPage, loadBranches]);

  useEffect(() => {
    if (!canSearchAddress) {
      setAddressSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingAddress(true);
        const response = await api.geo.searchAddress(formData.address);
        if (response.success) {
          setAddressSuggestions(response.data);
        }
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [canSearchAddress, formData.address]);

  const handleSelectAddress = (address: AddressSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      address: address.displayName,
      latitude: address.lat,
      longitude: address.lng,
    }));
    setAddressSuggestions([]);
  };

  const buildOsmEmbedUrl = (lat?: number, lng?: number) => {
    if (lat == null || lng == null) return null;
    const delta = 0.01;
    const left = (lng - delta).toFixed(6);
    const right = (lng + delta).toFixed(6);
    const top = (lat + delta).toFixed(6);
    const bottom = (lat - delta).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('El nombre de la sede es obligatorio', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.branches.create(formData);
      if (response.success) {
        showToast('Sede creada con éxito', 'success');
        setIsModalOpen(false);
        setFormData({ name: '', timezone: 'America/Lima', address: '', latitude: undefined, longitude: undefined });
        setAddressSuggestions([]);
        setBranchesPage(1);
        await loadBranches(1);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al crear sede', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-heading">Sucursales</h1>
          <p className="text-gray-500 dark:text-gray-400">Configura y monitorea todas tus sedes operativas.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-[#7c3aed]/20 w-fit"
        >
          <Plus className="w-5 h-5" />
          Nueva Sucursal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && branches.length === 0 ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#141414] p-8 rounded-3xl border border-gray-200 dark:border-white/5 animate-pulse h-64" />
          ))
        ) : branches.length > 0 ? (
          branches.map((branch) => (
            <div key={branch.id} className="bg-white dark:bg-[#141414] p-8 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#7c3aed]/5 dark:bg-purple-500/10 rounded-bl-[100px] -mr-8 -mt-8 group-hover:bg-[#7c3aed]/10 dark:group-hover:bg-purple-500/20 transition-colors" />

              <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-[#7c3aed] dark:text-purple-400" />
              </div>

              <h3 className="text-xl font-bold text-black dark:text-white mb-4">{branch.name}</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#1e1e1e] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="font-medium">{branch.timezone}</span>
                </div>
                {branch.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#1e1e1e] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="font-medium leading-snug">{branch.address}</span>
                  </div>
                )}
                {branch.latitude != null && branch.longitude != null && (
                  <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5">
                    <iframe
                      title={`map-${branch.id}`}
                      src={buildOsmEmbedUrl(Number(branch.latitude), Number(branch.longitude)) ?? undefined}
                      className="w-full h-40"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#1e1e1e] flex items-center justify-center">
                    <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="font-medium text-xs truncate">ID: {branch.id}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/5 flex justify-between items-center text-xs font-black uppercase tracking-widest">
                <span className="text-green-500 dark:text-green-400">Activo</span>
                <button className="text-[#7c3aed] dark:text-purple-400 hover:underline">Gestionar Sede</button>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-400 dark:text-gray-500 py-20 italic">No se encontraron sucursales.</p>
        )}
      </div>
      <PaginationControls
        meta={branchesPagination}
        isLoading={loading}
        onPageChange={setBranchesPage}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Sede">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Nombre de la Sede</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Sede Norte o Almacén Central"
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value,
                  latitude: undefined,
                  longitude: undefined,
                })
              }
              placeholder="Escribe una dirección para sugerencias OSM"
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {isSearchingAddress && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Buscando dirección...</p>
            )}
            {addressSuggestions.length > 0 && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e1e1e] shadow-lg">
                {addressSuggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    onClick={() => handleSelectAddress(item)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 border-b last:border-b-0 border-gray-200 dark:border-white/5 text-black dark:text-white"
                  >
                    {item.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formData.latitude != null && formData.longitude != null && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Mapa de referencia</label>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5">
                <iframe
                  title="map-preview"
                  src={buildOsmEmbedUrl(formData.latitude, formData.longitude) ?? undefined}
                  className="w-full h-56"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Zona Horaria (Timezone)</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-black dark:text-white appearance-none"
            >
              <option value="America/Lima">Perú (America/Lima)</option>
              <option value="America/Mexico_City">México (CDMX)</option>
              <option value="America/Bogota">Colombia (Bogotá)</option>
              <option value="America/Santiago">Chile (Santiago)</option>
              <option value="UTC">UTC (Global)</option>
            </select>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-xl shadow-[#7c3aed]/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Registrar Sede
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}