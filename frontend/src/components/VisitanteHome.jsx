import React from 'react';
import { CalendarCheck, LogIn } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function VisitanteHome({ onVerAsistencias, onOpenLogin }) {
  const cards = [
    {
      id: 'asistencias',
      title: 'Asistencias de Hoy',
      description: 'Consulta la presencia del personal en tiempo real para el día de hoy.',
      icon: CalendarCheck,
      highlighted: true,
      onClick: onVerAsistencias,
    },
    {
      id: 'login',
      title: 'Iniciar Sesión',
      description: 'Accede al sistema con tu cuenta para gestionar asistencias y reportes.',
      icon: LogIn,
      highlighted: false,
      onClick: onOpenLogin,
      accentColor: 'text-secondary',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-between pb-12 relative overflow-x-hidden text-gray-900 dark:text-white">
      {/* Banner Superior con la Imagen Institucional 'sistema_asistencias.jpeg' */}
      <div className="w-full h-48 sm:h-64 relative mb-6 border-b border-gray-200 dark:border-zinc-800 bg-gray-900 overflow-hidden">
        <img
          src="/sistema_asistencias.jpeg"
          alt="Sistema de Asistencias"
          className="w-full h-full object-cover object-center opacity-90 transition-opacity duration-300"
        />
        {/* Shadow Overlay elegante */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>

        {/* Switch de Tema Flotante sobre la Imagen */}
        <div className="absolute top-4 right-4 z-10 backdrop-blur-md p-1 rounded-full bg-black/40 border border-white/20">
          <ThemeToggle />
        </div>
      </div>

      {/* Header Gran Formato con Tipografía Valve */}
      <div className="w-full max-w-2xl px-6 flex flex-col items-center my-auto">
        <div className="text-center mb-10">
          <h1 className="font-valve text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-wide leading-tight uppercase">
            Sistema de Control de Asistencias
          </h1>

          <p className="text-base text-gray-500 dark:text-zinc-400 mt-3 max-w-lg mx-auto leading-relaxed">
            Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
          </p>
        </div>

        {/* Grid 2 tarjetas — Colores Institucionales en Claro, Negro/Blanco en Oscuro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={card.onClick}
                className={`group text-left rounded-xl p-6 transition-all cursor-pointer ${
                  card.highlighted
                    ? 'bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 border border-primary dark:border-white shadow-md'
                    : 'bg-white text-gray-900 dark:bg-black dark:text-white border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-zinc-500 shadow-2xs'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                    card.highlighted
                      ? 'bg-white/20 dark:bg-black/10 text-white dark:text-black'
                      : 'bg-gray-50 dark:bg-zinc-900 group-hover:bg-primary/5 dark:group-hover:bg-white/10'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      card.highlighted ? 'text-white dark:text-black' : card.accentColor || 'text-gray-700 dark:text-zinc-300'
                    }`}
                  />
                </div>
                <h3
                  className="font-valve text-lg font-bold mb-1 tracking-wide"
                >
                  {card.title}
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    card.highlighted ? 'text-white/80 dark:text-zinc-700' : 'text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-xs text-gray-400 dark:text-zinc-600 font-medium text-center font-mono">
        v1.0.0
      </div>
    </div>
  );
}
