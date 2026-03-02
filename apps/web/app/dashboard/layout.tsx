'use client';

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowRightLeft,
  Building2,
  Users,
  Truck,
  Wallet,
  Settings,
  LogOut,
  Bell,
  Search,
  Moon,
  Sun,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen bg-white dark:bg-[#0a0a0a] flex overflow-hidden">
      
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 260 : 80 }}
        transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white hidden lg:flex flex-col fixed h-screen top-0 left-0 z-50 border-r border-gray-200 dark:border-white/5 overflow-hidden py-6"
      >
        <div className="mb-10 px-3 h-8 flex items-center justify-center">
          <div className={cn('flex items-center transition-all duration-300 w-full', isExpanded ? 'px-3 gap-4 justify-start' : 'justify-center')}>
            <span className="text-2xl font-extrabold tracking-tighter text-violet-500 min-w-[32px] text-center">M</span>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="font-bold text-xl whitespace-nowrap">
                  MANAGER
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3 overflow-y-auto no-scrollbar">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" active={pathname === '/dashboard'} isExpanded={isExpanded} />
          <SidebarItem icon={ShoppingCart} label="Ventas" href="/dashboard/ventas" active={pathname === '/dashboard/ventas'} isExpanded={isExpanded} />
          <SidebarItem icon={Package} label="Inventario" href="/dashboard/inventario" active={pathname === '/dashboard/inventario'} isExpanded={isExpanded} />
          <SidebarItem icon={ArrowRightLeft} label="Movimientos" href="/dashboard/movimientos" active={pathname === '/dashboard/movimientos'} isExpanded={isExpanded} />
          <SidebarItem icon={Building2} label="Sucursales" href="/dashboard/sucursales" active={pathname === '/dashboard/sucursales'} isExpanded={isExpanded} />
          <SidebarItem icon={Users} label="Clientes" href="/dashboard/clientes" active={pathname === '/dashboard/clientes'} isExpanded={isExpanded} />
          <SidebarItem icon={Truck} label="Proveedores" href="/dashboard/proveedores" active={pathname === '/dashboard/proveedores'} isExpanded={isExpanded} />
          <SidebarItem icon={Wallet} label="Caja" href="/dashboard/caja" active={pathname === '/dashboard/caja'} isExpanded={isExpanded} />
        </nav>

        <div className="pt-6 border-t border-gray-200 dark:border-white/5 space-y-2 px-3">
          <SidebarItem icon={Settings} label="Configuración" href="/dashboard/settings" active={pathname === '/dashboard/settings'} isExpanded={isExpanded} />
          <button onClick={handleLogout} className={cn('w-full flex items-center p-3 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all group', isExpanded ? 'justify-start gap-4' : 'justify-center')}>
            <LogOut className="w-5 h-5 min-w-[20px]" />
            <AnimatePresence>{isExpanded && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">Cerrar Sesión</motion.span>}</AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Area */}
      <motion.div initial={false} animate={{ marginLeft: isExpanded ? 260 : 80 }} transition={{ type: 'spring', stiffness: 150, damping: 25 }} className="flex-1 h-screen flex flex-col bg-white dark:bg-[#0a0a0a] overflow-hidden">
        
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-40 border-b border-gray-200 dark:border-white/5">
          {/* Rayita divisoria colocada de nuevo aquí (pr-6 border-r) */}
          <div className="flex items-center gap-4 pr-6 border-r border-gray-200 dark:border-white/10">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-violet-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-11 pr-4 py-2.5 bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-white/5 rounded-xl w-72 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" 
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-white/10">
              
              <button className="p-2.5 bg-gray-100 dark:bg-[#141414] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 rounded-xl transition-all relative hover:bg-gray-200 dark:hover:bg-white/10 group">
                <Bell className="w-5 h-5 transition-colors group-hover:text-violet-500" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#0a0a0a]" />
              </button>

              <button
                onClick={toggleTheme}
                className="p-2.5 bg-gray-100 dark:bg-[#141414] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-white/10 group"
              >
                <div className="transition-colors group-hover:text-violet-500">
                   {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </div>
              </button>
            </div>

            <button className="flex items-center gap-3 pl-1 pr-3 py-1 bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-white/5 rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                <span className="font-bold text-white text-sm">{user?.email?.[0].toUpperCase() || 'JA'}</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-none mb-1">{user?.email?.split('@')[0] || 'Jhon Abad'}</p>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wider">Administrador</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-violet-500 transition-colors ml-1" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {children}
        </main>
      </motion.div>
    </div>
  );
}

function SidebarItem({ icon: Icon, href, label, active = false, isExpanded }: any) {
  return (
    <Link href={href} className="block">
      <button
        className={cn(
          'w-full flex items-center p-3 rounded-xl transition-all relative group',
          isExpanded ? 'justify-start gap-4' : 'justify-center',
          active
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
        )}
      >
        <motion.div
          initial={false}
          animate={{ scale: active ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex items-center justify-center"
        >
          <Icon className={cn('w-5 h-5 min-w-[20px]', !active && 'group-hover:scale-110 transition-transform')} />
        </motion.div>

        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="whitespace-nowrap font-medium"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </Link>
  );
}