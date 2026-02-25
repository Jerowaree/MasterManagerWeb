"use client";

import React, { useEffect, useState } from 'react';
import { Building2, Plus, Pin, Clock, Globe, Save, Loader2, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';

export default function SucursalesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    timezone: 'America/Lima',
  });

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await api.branches.findAll();
      if (response.success) {
        setBranches(response.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al cargar sucursales', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

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
        setFormData({ name: '', timezone: 'America/Lima' });
        loadBranches();
      }
    } catch (err: any) {
      showToast(err.message || 'Error al crear sede', 'error');
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Crear Nueva Sede"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre de la Sede</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ej: Sede Norte o Almacén Central"
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Zona Horaria (Timezone)</label>
            <select 
              value={formData.timezone}
              onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
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
