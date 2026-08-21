import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarCheck, Users, Radio, ShieldCheck, LogOut, User, KeyRound, UserCog, LayoutDashboard, Table, FileSignature, Cpu, Zap, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RequierePermiso from './RequierePermiso';
import LoginModal from './LoginModal';
import CambiarPasswordModal from './CambiarPasswordModal';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const userPermisos = user?.permisos || [];
  const esAdminOJefe = user?.rol === 'Admin' || user?.rol === 'Jefe de Oficina' || userPermisos.includes('asistencias.ver');

  const navItems = [
    { to: '/', label: 'Asistencias', icon: CalendarCheck, permission: null },
    { to: '/empleados', label: 'Practicantes', icon: Users, permission: 'empleados.ver' },
    { to: '/informes', label: 'Informes & Firma', icon: FileSignature, permission: 'asistencias.exportar' },
    { to: '/dispositivos', label: 'Dispositivos Nuevos', icon: Radio, permission: 'dispositivos.ver' },
    { to: '/usuarios', label: 'Usuarios y Roles', icon: UserCog, permission: 'usuarios.gestionar' },
    { to: '/agente', label: 'Control del Agente', icon: Cpu, permission: 'agente.gestionar' },
  ];

  // Visitante: ocultar sidebar siempre para mantener vista pública amigable y minimalista
  const hideSidebar = !user;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-800 dark:text-white font-sans">
      {/* Sidebar fijo solo cuando el usuario está autenticado */}
      {!hideSidebar && (
        <aside className="w-64 bg-[#3484A5] text-white border-r border-[#2b6f8b] dark:bg-black dark:border-zinc-800 flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 shadow-md">
          <div className="p-5 border-b border-white/20 dark:border-zinc-800">
            <h1 className="text-sm font-bold text-white dark:text-white leading-tight font-mono uppercase tracking-wider">Sistema de Asistencias</h1>
            <p className="text-[11px] text-white/70 dark:text-zinc-500 font-mono mt-0.5">Gestión & Control</p>
          </div>

          {/* Navegación Dinámica en el Menú Lateral Izquierdo */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAsistencias = item.to === '/';

              const navLinkElement = (
                <div key={item.to} className="space-y-1">
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive && !isAsistencias
                          ? 'bg-white/20 text-white font-bold backdrop-blur-xs dark:bg-white dark:text-black'
                          : isActive && isAsistencias
                          ? 'bg-white/20 text-white font-bold backdrop-blur-xs dark:bg-zinc-900 dark:text-white'
                          : 'text-white/85 hover:bg-white/10 hover:text-white dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>

                  {/* Sub-módulos sangrados en el menú lateral izquierdo bajo Asistencias */}
                  {isAsistencias && location.pathname === '/' && (
                    <div className="pl-4 space-y-1 pt-1 border-l-2 border-white/30 dark:border-zinc-800 ml-5">
                      {!esAdminOJefe ? (
                        <>
                          <NavLink
                            to="/?tab=marcar"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              currentTab === 'marcar' || !['registros', 'avance'].includes(currentTab)
                                ? 'bg-white/25 text-white font-bold dark:bg-zinc-800 dark:text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>1. Marcar Mi Asistencia</span>
                          </NavLink>

                          <NavLink
                            to="/?tab=registros"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              currentTab === 'registros'
                                ? 'bg-white/25 text-white font-bold dark:bg-zinc-800 dark:text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          >
                            <Table className="w-3.5 h-3.5" />
                            <span>2. Tabla de Registros</span>
                          </NavLink>

                          <NavLink
                            to="/?tab=avance"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              currentTab === 'avance'
                                ? 'bg-white/25 text-white font-bold dark:bg-zinc-800 dark:text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>3. Mi Avance & Ranking</span>
                          </NavLink>
                        </>
                      ) : (
                        <>
                          <NavLink
                            to="/?tab=dashboard"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              currentTab === 'dashboard' || !['dia', 'tabla'].includes(currentTab)
                                ? 'bg-white/25 text-white font-bold dark:bg-zinc-800 dark:text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            <span>1. Dashboard & Rankings</span>
                          </NavLink>

                          <NavLink
                            to="/?tab=dia"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              currentTab === 'dia'
                                ? 'bg-white/25 text-white font-bold dark:bg-zinc-800 dark:text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>2. Presencia del Día</span>
                          </NavLink>

                          <NavLink
                            to="/?tab=tabla"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              currentTab === 'tabla'
                                ? 'bg-white/25 text-white font-bold dark:bg-zinc-800 dark:text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          >
                            <Table className="w-3.5 h-3.5" />
                            <span>3. Tabla de Registros</span>
                          </NavLink>
                        </>
                      )}

                    </div>
                  )}
                </div>
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
          <div className="p-4 border-t border-white/20 dark:border-zinc-800 bg-black/10 dark:bg-black space-y-3">
            <div className="flex items-center space-x-3 bg-white/10 dark:bg-zinc-900 p-2.5 rounded-lg border border-white/15 dark:border-zinc-800 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-zinc-800 flex items-center justify-center text-white shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white dark:text-white truncate">{user.email}</p>
                <p className="text-[10px] text-white/70 dark:text-zinc-500 font-medium capitalize font-mono">
                  Rol: <span className="text-white dark:text-zinc-300 font-bold">{user.rol}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 border border-white/20 dark:border-zinc-800 text-white dark:text-zinc-300 text-xs font-medium rounded-lg hover:bg-white/15 dark:hover:bg-zinc-800 transition-colors cursor-pointer mb-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-white/80" />
              <span>Cambiar contraseña</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 border border-white/20 dark:border-zinc-800 text-white dark:text-zinc-300 text-xs font-medium rounded-lg hover:bg-white/15 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-white/80" />
              <span>Cerrar sesión</span>
            </button>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-white/60 dark:text-zinc-600 font-medium">v1.0.0</span>
            </div>
          </div>
        </aside>
      )}

      {/* Contenido Principal */}
      <main className={`flex-1 ${hideSidebar ? '' : 'ml-64'} overflow-y-auto min-h-screen flex flex-col`}>
        {/* Barra Superior Centrada con el Interruptor de Tema (Dark Mode) */}
        {!hideSidebar && (
          <header className="h-12 border-b border-gray-200 dark:border-zinc-800/80 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-gray-100/80 dark:bg-zinc-900/80 px-3 py-1 rounded-full border border-gray-200/80 dark:border-zinc-800 shadow-2xs">
              <ThemeToggle />
            </div>
          </header>
        )}

        <div className={hideSidebar ? '' : 'p-8 flex-1'}>
          <Outlet context={{
            onOpenLogin: () => setIsLoginOpen(true),
            onOpenPasswordModal: () => setIsPasswordModalOpen(true),
          }} />
        </div>
      </main>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <CambiarPasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </div>
  );
}
