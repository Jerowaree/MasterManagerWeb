    "use client";

import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Search, Filter, Loader2, Save, Calculator, Calendar, ReceiptText, FileSpreadsheet, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { motion } from 'framer-motion';
import { exportToExcel } from '@/lib/excel-utils';

export default function VentasPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [cashClosing, setCashClosing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    customerId: '',
    branchId: '',
    total: '',
    status: 'paid'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesRes, customersRes, branchesRes] = await Promise.all([
        api.sales.findAll(),
        api.customers.findAll(),
        api.branches.findAll()
      ]);

      if (salesRes.success) setSales(salesRes.data);
      if (customersRes.success) setCustomers(customersRes.data);
      if (branchesRes.success) setBranches(branchesRes.data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCashClosing = async () => {
    try {
      const response = await api.reports.getCashClosing();
      if (response.success) {
        setCashClosing(response.data);
        setIsCashModalOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al generar cierre de caja', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchId || !formData.total) {
      showToast('Por favor completa los campos obligatorios', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.sales.create({
        ...formData,
        total: parseFloat(formData.total),
        customerId: formData.customerId || null
      });

      if (response.success) {
        showToast('Venta registrada con éxito', 'success');
        setIsModalOpen(false);
        setFormData({ customerId: '', branchId: '', total: '', status: 'paid' });
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error al registrar venta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportSales = () => {
    if (sales.length === 0) {
      showToast('No hay datos para exportar', 'error');
      return;
    }

    const dataToExport = sales.map(s => ({
      ID: s.id.slice(0, 8),
      Cliente: s.customer?.name || 'Venta Rápida',
      Sede: s.branch?.name,
      Fecha: new Date(s.createdAt).toLocaleDateString(),
      Total: Number(s.total),
      Estado: s.status === 'paid' ? 'Completado' : 'Pendiente'
    }));

    exportToExcel(dataToExport, 'Reporte_Ventas', 'Ventas');
    showToast('Archivo Excel generado', 'success');
  };

  const handleExportCashClosing = () => {
    if (!cashClosing) return;

    const dataToExport = cashClosing.sales.map((s: any) => ({
      ID: s.id.slice(0, 8),
      Cliente: s.customer?.name || 'Venta Rápida',
      Sede: s.branch?.name,
      Moneda: 'PEN',
      Total: Number(s.total),
      Fecha: new Date(s.createdAt).toLocaleString()
    }));

    exportToExcel(dataToExport, `Cierre_Caja_${new Date().toISOString().split('T')[0]}`, 'Cierre de Caja');
    showToast('Cierre de caja exportado a Excel', 'success');
  };

  const handleSendEmail = async () => {
    try {
      showToast('Enviando reporte por correo...', 'info');
      const response = await api.reports.sendEmailReport('sales');
      if (response.success) {
        showToast('Reporte enviado a tu correo con éxito', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al enviar correo', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-heading">Ventas</h1>
          <p className="text-gray-500">Gestiona y visualiza todas las transacciones de tus sedes.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSendEmail}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm w-fit"
          >
            <Mail className="w-5 h-5 text-[#7c3aed]" />
            Enviar Reporte
          </button>
          <button 
            onClick={loadCashClosing}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm w-fit"
          >
            <Calculator className="w-5 h-5 text-gray-400" />
            Cierre de Caja
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-[#7c3aed]/20 w-fit"
          >
            <Plus className="w-5 h-5" />
            Nueva Venta
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por cliente o ID..." 
              className="pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl w-full focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportSales}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Exportar
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">ID</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Cliente</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Sede</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Fecha</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Total</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && sales.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8">
                       <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-400">#{sale.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-black">{sale.customer?.name || 'Venta Rápida'}</div>
                      <div className="text-xs text-gray-400">{sale.customer?.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{sale.branch?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-black">
                      S/ {Number(sale.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        sale.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {sale.status === 'paid' ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                    No hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Closing Modal */}
      <Modal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        title="Resumen de Cierre de Caja"
      >
        {cashClosing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#7c3aed]" />
                <span className="font-bold text-black italic">Fecha del reporte:</span>
              </div>
              <span className="text-sm font-black text-[#7c3aed] uppercase tracking-widest">
                {new Date(cashClosing.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Ventas</p>
                <p className="text-2xl font-bold text-black italic">S/ {Number(cashClosing.totalAmount).toFixed(2)}</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Operaciones</p>
                <p className="text-2xl font-bold text-black italic">{cashClosing.count}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <ReceiptText className="w-3 h-3" />
                Detalle de Operaciones de Hoy
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {cashClosing.sales.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-purple-200 transition-all">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-black">{s.customer?.name || 'Venta Rápida'}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase">{s.branch?.name}</span>
                    </div>
                    <span className="text-sm font-black text-black italic">S/ {Number(s.total).toFixed(2)}</span>
                  </div>
                ))}
                {cashClosing.sales.length === 0 && (
                  <p className="text-center py-10 text-gray-400 text-xs italic">Sin movimientos hoy.</p>
                )}
              </div>
            </div>

            <div className="pt-6 grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.print()}
                className="py-4 bg-white border border-gray-200 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm italic flex items-center justify-center gap-2"
              >
                Imprimir Reporte Z
              </button>
              <button 
                onClick={handleExportCashClosing}
                className="py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 italic flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                Excel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Sale Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Registrar Nueva Venta"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cliente (Opcional)</label>
            <select 
              value={formData.customerId}
              onChange={(e) => setFormData({...formData, customerId: e.target.value})}
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
            >
              <option value="">Venta Rápida (Sin Cliente)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sede</label>
            <select 
              required
              value={formData.branchId}
              onChange={(e) => setFormData({...formData, branchId: e.target.value})}
              className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
            >
              <option value="">Selecciona una sede</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Monto Total (S/)</label>
              <input 
                type="number"
                step="0.01"
                required
                value={formData.total}
                onChange={(e) => setFormData({...formData, total: e.target.value})}
                placeholder="0.00"
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm text-right"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Estado</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all font-bold text-sm appearance-none"
              >
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold hover:bg-[#6d28d9] transition-all shadow-xl shadow-[#7c3aed]/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Finalizar Venta
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
