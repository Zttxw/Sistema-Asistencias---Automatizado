import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarCheck, Users, Radio, ShieldCheck, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RequierePermiso from './RequierePermiso';
import LoginModal from './LoginModal';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const { user, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Asistencias', icon: CalendarCheck, permission: null },
    { to: '/empleados', label: 'Empleados', icon: Users, permission: 'empleados.ver' },
    { to: '/dispositivos', label: 'Dispositivos Nuevos', icon: Radio, permission: 'dispositivos.ver' },
  ];

  // Visitante: ocultar sidebar siempre para mantener vista pública amigable y minimalista
  const hideSidebar = !user;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-800 dark:text-white font-sans">
      {/* Sidebar fijo solo cuando el usuario está autenticado */}
      {!hideSidebar && (
        <aside className="w-64 bg-white dark:bg-black border-r border-gray-100 dark:border-zinc-800 flex flex-col shrink-0 fixed inset-y-0 left-0 z-30">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary dark:text-white" />
            </div>
            <div>
              <h1 className="font-valve text-base font-bold text-gray-900 dark:text-white leading-tight">Sistema de Asistencias</h1>
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Gestión & Control</p>
            </div>
          </div>

          {/* Navegación Dinámica */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const navLinkElement = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-primary/10 text-primary font-semibold dark:bg-white dark:text-black'
                      : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );

              if (!item.permission) {
                return navLinkElement;
              }

              return (
                <RequierePermiso key={item.to} codigo={item.permission}>
                  {navLinkElement}
                </RequierePermiso>
              );
            })}
          </nav>

          {/* Estado de Sesión / User Badge */}
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-black space-y-3">
            <div className="flex items-center space-x-3 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.email}</p>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium capitalize">
                  Rol: <span className="text-secondary font-semibold">{user.rol}</span>
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 text-xs font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-zinc-600 font-medium">v1.0.0</span>
              <ThemeToggle />
            </div>
          </div>
        </aside>
      )}

      {/* Contenido Principal */}
      <main className={`flex-1 ${hideSidebar ? '' : 'ml-64 p-8'} overflow-y-auto min-h-screen`}>
        <Outlet context={{
          onOpenLogin: () => setIsLoginOpen(true),
        }} />
      </main>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}
