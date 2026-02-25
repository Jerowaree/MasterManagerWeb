"use client";

import React from 'react';
import { 
  Building2, 
  ShoppingCart, 
  Users, 
  Package, 
  LayoutDashboard,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-black text-white p-6 flex-col hidden lg:flex fixed h-screen top-0 left-0">
        <div className="flex items-center gap-3 mb-10 px-2 uppercase">
          <span className="text-xl font-extrabold tracking-tighter">
            <span className="text-white">Master</span>
            <span className="text-[#7c3aed]">Manager</span>
          </span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Resumen" href="/dashboard" active={pathname === '/dashboard'} />
          <SidebarItem icon={ShoppingCart} label="Ventas" href="/dashboard/ventas" active={pathname === '/dashboard/ventas'} />
          <SidebarItem icon={Package} label="Inventario" href="/dashboard/inventario" active={pathname === '/dashboard/inventario'} />
          <SidebarItem icon={Building2} label="Sucursales" href="/dashboard/sucursales" active={pathname === '/dashboard/sucursales'} />
          <SidebarItem icon={Users} label="Clientes" href="/dashboard/clientes" active={pathname === '/dashboard/clientes'} />
        </nav>

        <div className="pt-6 border-t border-white/10 space-y-2">
          <SidebarItem icon={Settings} label="Configuración" href="/dashboard/settings" />
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar operación..." 
                className="pl-11 pr-4 py-2.5 bg-gray-50 border-transparent rounded-2xl w-64 focus:bg-white focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#7c3aed] rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-[1px] bg-gray-100 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-black">{user?.email.split('@')[0]}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user?.role}</div>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-xl border border-purple-200 flex items-center justify-center font-bold text-[#7c3aed]">
                {user?.email[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, href, active = false }: any) {
  return (
    <Link href={href}>
      <button className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active ? "bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20" : "text-gray-400 hover:text-white hover:bg-white/5"
      )}>
        <Icon className="w-5 h-5" />
        <span className="font-medium text-sm">{label}</span>
        {active && <motion.div layoutId="active-sidebar" className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />}
      </button>
    </Link>
  );
}
