// app/dashboard/layout.tsx
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
  Menu,
  X,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence, Transition } from 'framer-motion';
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
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f0a1e]">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const transitionConfig: Transition = { duration: 0.3, ease: "easeInOut" };

  const renderSidebarContent = (expanded: boolean, isMobileView: boolean = false) => (
    <>
      <div className="mb-10 px-4 h-8 flex items-center justify-between w-full relative z-10">
        <div className="flex items-center">
          <div className="min-w-[48px] flex items-center justify-center">
            <span className="text-2xl font-extrabold tracking-tighter text-violet-500">M</span>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span 
                initial={{ opacity: 0, width: 0, marginLeft: 0 }} 
                animate={{ opacity: 1, width: "auto", marginLeft: 8 }} 
                exit={{ opacity: 0, width: 0, marginLeft: 0 }} 
                transition={transitionConfig}
                className="font-bold text-xl whitespace-nowrap overflow-hidden"
              >
                MANAGER
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        {isMobileView && (
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 px-3 overflow-y-auto no-scrollbar relative z-10">
        <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" active={pathname === '/dashboard'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={ShoppingCart} label="Ventas" href="/dashboard/ventas" active={pathname === '/dashboard/ventas'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={FileText} label="Cobranza" href="/dashboard/cobranza" active={pathname === '/dashboard/cobranza'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={Package} label="Inventario" href="/dashboard/inventario" active={pathname === '/dashboard/inventario'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={ArrowRightLeft} label="Historial" href="/dashboard/historial" active={pathname === '/dashboard/historial'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={Building2} label="Sucursales" href="/dashboard/sucursales" active={pathname === '/dashboard/sucursales'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={Users} label="Clientes" href="/dashboard/clientes" active={pathname === '/dashboard/clientes'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={Truck} label="Proveedores" href="/dashboard/proveedores" active={pathname === '/dashboard/proveedores'} isExpanded={expanded} transitionConfig={transitionConfig} />
        <SidebarItem icon={Wallet} label="Caja" href="/dashboard/caja" active={pathname === '/dashboard/caja'} isExpanded={expanded} transitionConfig={transitionConfig} />
      </nav>

      <div className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-2 px-3 relative z-10">
        <SidebarItem icon={Settings} label="Configuración" href="/dashboard/settings" active={pathname === '/dashboard/settings'} isExpanded={expanded} transitionConfig={transitionConfig} />
        
        <button onClick={handleLogout} className="w-full flex items-center p-3 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors group overflow-hidden">
          <div className="min-w-[32px] flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span 
                initial={{ opacity: 0, width: 0, marginLeft: 0 }} 
                animate={{ opacity: 1, width: "auto", marginLeft: 16 }} 
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={transitionConfig}
                className="whitespace-nowrap overflow-hidden text-left"
              >
                Cerrar Sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );

  return (
    // CAMBIO IMPORTANTE: h-[100dvh] en lugar de h-screen para navegadores móviles
    <div className="h-[100dvh] bg-white dark:bg-[#0f0a1e] flex overflow-hidden relative">
      
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-0 hidden dark:block">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 260 : 80 }}
        transition={transitionConfig}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="bg-white dark:bg-white/5 text-gray-900 dark:text-white hidden lg:flex flex-col fixed h-[100dvh] top-0 left-0 z-50 border-r border-gray-200 dark:border-white/10 dark:backdrop-blur-xl overflow-hidden py-6"
      >
        {renderSidebarContent(isExpanded, false)}
      </motion.aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-[100dvh] w-[260px] bg-white dark:bg-[#0f0a1e]/90 dark:backdrop-blur-2xl z-[70] lg:hidden flex flex-col border-r border-gray-200 dark:border-white/10 py-6 shadow-2xl"
          >
            {renderSidebarContent(true, true)}
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.div 
        initial={false} 
        animate={{ marginLeft: isMobile ? 0 : (isExpanded ? 260 : 80) }} 
        transition={transitionConfig} 
        className="flex-1 h-[100dvh] flex flex-col bg-transparent overflow-hidden w-full relative z-10"
      >
        {/* CAMBIO IMPORTANTE: Quitamos sticky y aseguramos el flex behavior */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 relative bg-white/80 dark:bg-[#0f0a1e]/50 backdrop-blur-md dark:backdrop-blur-2xl z-40 border-b border-gray-200 dark:border-white/10">
          
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2.5 mr-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-4 pr-6 border-r border-gray-200 dark:border-white/10">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-violet-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="pl-11 pr-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-72 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <div className="flex items-center gap-1 md:gap-2 pr-2 md:pr-4 border-r border-gray-200 dark:border-white/10">
              <button className="p-2 md:p-2.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-xl transition-all relative hover:bg-gray-200 dark:hover:bg-white/10 group">
                <Bell className="w-4 h-4 md:w-5 md:h-5 transition-colors group-hover:text-violet-500" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#0f0a1e]" />
              </button>

              <button onClick={toggleTheme} className="p-2 md:p-2.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-white/10 group">
                <div className="transition-colors group-hover:text-violet-500">
                   {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
                </div>
              </button>
            </div>

            <button className="flex items-center gap-2 md:gap-3 pl-1 pr-1 md:pr-3 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all group">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-600 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                <span className="font-bold text-white text-xs md:text-sm">{user?.email?.[0].toUpperCase() || 'US'}</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-800 dark:text-white leading-none mb-1">{user?.email?.split('@')[0] || 'Usuario'}</p>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Admin</p>
                </div>
              </div>
              <ChevronDown className="hidden md:block w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-violet-500 transition-colors ml-1" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-10 relative">
          {children}
        </main>
      </motion.div>
    </div>
  );
}

function SidebarItem({ icon: Icon, href, label, active = false, isExpanded, transitionConfig }: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label: string;
  active?: boolean;
  isExpanded: boolean;
  transitionConfig: Transition;
}) {
  return (
    <Link href={href} className="block">
      <button
        className={cn(
          'w-full flex items-center p-3 rounded-xl transition-colors relative group overflow-hidden',
          active
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
        )}
      >
        <motion.div
          initial={false}
          animate={{ scale: active ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="min-w-[32px] flex items-center justify-center"
        >
          <Icon className={cn('w-5 h-5', !active && 'group-hover:scale-110 transition-transform')} />
        </motion.div>

        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: "auto", marginLeft: 16 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={transitionConfig}
              className="whitespace-nowrap font-medium overflow-hidden text-left"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </Link>
  );
}