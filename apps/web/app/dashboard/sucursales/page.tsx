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
    <div className="space-y-6 md:space-y-8 min-h-screen bg-white dark:bg-transparent pb-10">
      
      {/* HEADER REESTRUCTURADO */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between w-full gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight truncate">
            Sucursales
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 md:gap-2 px-3.5 py-2.5 md:px-6 md:py-3 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-xl md:rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] text-sm md:text-base shrink-0"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Nueva sucursal</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Configura y monitorea todas tus sedes operativas.
        </p>
      </div>

      {/* GRID DE SUCURSALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {loading && branches.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-gray-200/80 dark:border-white/10 animate-pulse h-64 shadow-sm" />
          ))
        ) : branches.length > 0 ? (
          branches.map((branch) => (
            <div 
              key={branch.id} 
              className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:border-violet-300 dark:hover:border-purple-500/30 transition-all relative overflow-hidden group flex flex-col h-full"
            >
              {/* Resplandor superior derecho decorativo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 dark:bg-purple-500/10 blur-2xl rounded-bl-full -mr-8 -mt-8 group-hover:bg-violet-500/10 dark:group-hover:bg-purple-500/20 transition-colors duration-500 pointer-events-none" />

              <div className="w-12 h-12 md:w-14 md:h-14 bg-violet-50/50 dark:bg-purple-500/10 border border-violet-100 dark:border-purple-500/20 rounded-2xl flex items-center justify-center mb-5 md:mb-6 shadow-sm relative z-10">
                <Building2 className="w-6 h-6 md:w-7 md:h-7 text-violet-600 dark:text-purple-400" />
              </div>

              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight relative z-10">{branch.name}</h3>

              <div className="space-y-3.5 flex-1 relative z-10">
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="font-medium truncate">{branch.timezone}</span>
                </div>
                
                {branch.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-medium leading-relaxed pt-1">{branch.address}</span>
                  </div>
                )}
                
                {branch.latitude != null && branch.longitude != null && (
                  <div className="rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/10 shadow-sm mt-4">
                    <iframe
                      title={`map-${branch.id}`}
                      src={buildOsmEmbedUrl(Number(branch.latitude), Number(branch.longitude)) ?? undefined}
                      className="w-full h-36 md:h-40 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 pt-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="font-medium text-[11px] truncate uppercase tracking-wider">ID: {branch.id.slice(0, 12)}...</span>
                </div>
              </div>

              <div className="mt-6 pt-5 md:mt-8 md:pt-6 border-t border-gray-100 dark:border-white/10 flex justify-between items-center text-[10px] md:text-xs font-bold uppercase tracking-widest relative z-10">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Activo
                </span>
                <button className="text-violet-600 dark:text-purple-400 hover:text-violet-700 dark:hover:text-purple-300 transition-colors">
                  Gestionar Sede
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white dark:bg-white/5 dark:backdrop-blur-xl p-20 rounded-3xl border border-gray-200/80 dark:border-white/10 border-dashed text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron sucursales.</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-center w-full mt-2">
        <PaginationControls
          meta={branchesPagination}
          isLoading={loading}
          onPageChange={setBranchesPage}
        />
      </div>

      {/* MODAL: CREAR SEDE */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Sede">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre de la Sede</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Sede Norte o Almacén Central"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dirección</label>
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
              placeholder="Escribe una dirección para buscar..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-sm text-gray-800 dark:text-white placeholder-gray-400"
            />
            {isSearchingAddress && (
              <p className="text-xs text-violet-500 dark:text-purple-400 mt-2 font-medium flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Buscando dirección...
              </p>
            )}
            
            {/* Menú flotante de sugerencias adaptado al Dark Mode */}
            {addressSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-xl custom-scrollbar">
                {addressSuggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    onClick={() => handleSelectAddress(item)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 border-b last:border-b-0 border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    {item.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formData.latitude != null && formData.longitude != null && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mapa de referencia</label>
              <div className="rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/10 shadow-sm">
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Zona Horaria (Timezone)</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-sm text-gray-800 dark:text-white appearance-none"
            >
              <option value="America/Lima" className="dark:bg-gray-900">Perú (America/Lima)</option>
              <option value="America/Mexico_City" className="dark:bg-gray-900">México (CDMX)</option>
              <option value="America/Bogota" className="dark:bg-gray-900">Colombia (Bogotá)</option>
              <option value="America/Santiago" className="dark:bg-gray-900">Chile (Santiago)</option>
              <option value="UTC" className="dark:bg-gray-900">UTC (Global)</option>
            </select>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-2xl font-medium transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50"
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