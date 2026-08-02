import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarCheck, Users, Radio, ShieldCheck } from 'lucide-react';

export default function Layout() {
  const navItems = [
    { to: '/', label: 'Asistencias', icon: CalendarCheck },
    { to: '/empleados', label: 'Empleados', icon: Users },
    { to: '/dispositivos', label: 'Dispositivos Nuevos', icon: Radio },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Sidebar fijo */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-tight">Sistema de Asistencias</h1>
            <p className="text-xs text-gray-400 font-medium">Gestión & Control</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center font-medium">
          v1.0.0 &bull; OTI
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
