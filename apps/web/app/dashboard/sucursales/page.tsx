"use client";

import React, { useEffect, useMemo, useState } from 'react';
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

  const loadBranches = async (page: number) => {
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
  };

  useEffect(() => {
    loadBranches(branchesPage);
  }, [branchesPage]);

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
        showToast('Sede creada con exito', 'success');
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
          <h1 className="text-3xl font-bold text-black font-heading">Sucursales</h1>
          <p className="text-gray-500">Configura y monitorea todas tus sedes operativas.</p>
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
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 animate-pulse h-64" />
          ))
        ) : branches.length > 0 ? (
          branches.map((branch) => (
            <div key={branch.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#7c3aed]/5 rounded-bl-[100px] -mr-8 -mt-8 group-hover:bg-[#7c3aed]/10 transition-colors" />

              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-[#7c3aed]" />
              </div>

              <h3 className="text-xl font-bold text-black mb-4">{branch.name}</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{branch.timezone}</span>
                </div>
                {branch.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-500">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="font-medium leading-snug">{branch.address}</span>
                  </div>
                )}
                {branch.latitude != null && branch.longitude != null && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100">
                    <iframe
                      title={`map-${branch.id}`}
                      src={buildOsmEmbedUrl(Number(branch.latitude), Number(branch.longitude)) ?? undefined}
                      className="w-full h-40"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-xs truncate">ID: {branch.id}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center text-xs font-black uppercase tracking-widest">
                <span className="text-green-500">Activo</span>
                <button className="text-[#7c3aed] hover:underline">Gestionar Sede</button>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-400 py-20 italic">No se encontraron sucursales.</p>
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
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre de la Sede</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Sede Norte o Almacen Central"
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Direccion</label>
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
              placeholder="Escribe una direccion para sugerencias OSM"
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            />
            {isSearchingAddress && (
              <p className="text-xs text-gray-400 mt-1">Buscando direccion...</p>
            )}
            {addressSuggestions.length > 0 && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-lg">
                {addressSuggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    onClick={() => handleSelectAddress(item)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                  >
                    {item.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formData.latitude != null && formData.longitude != null && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Mapa de referencia</label>
              <div className="rounded-2xl overflow-hidden border border-gray-100">
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
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Zona Horaria (Timezone)</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
            >
              <option value="America/Lima">Peru (America/Lima)</option>
              <option value="America/Mexico_City">Mexico (CDMX)</option>
              <option value="America/Bogota">Colombia (Bogota)</option>
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
