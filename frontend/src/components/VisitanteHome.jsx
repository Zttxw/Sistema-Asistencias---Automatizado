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
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-between p-6 sm:p-10 relative text-gray-900 dark:text-white overflow-x-hidden">
      {/* Switch de Tema Flotante */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Secciones del Menú Principal: Layout de 2 Sectores */}
      <div className="w-full max-w-5xl my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Sector Izquierdo: Títulos y Tarjetas */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-6 text-left">
          <div>
            <h1 className="font-valve text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-wide leading-tight uppercase">
              Sistema de Control de Asistencias
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-zinc-400 mt-3 leading-relaxed font-medium">
              Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
            </p>
          </div>

          {/* Grid 2 Tarjetas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-2">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={card.onClick}
                  className={`group text-left rounded-2xl p-6 transition-all cursor-pointer shadow-md ${
                    card.highlighted
                      ? 'bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 border border-primary dark:border-white'
                      : 'bg-white text-gray-900 dark:bg-black dark:text-white border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-zinc-500 shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                      card.highlighted
                        ? 'bg-white/20 dark:bg-black/10 text-white dark:text-black'
                        : 'bg-gray-100 dark:bg-zinc-900 group-hover:bg-primary/10 dark:group-hover:bg-white/10'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        card.highlighted ? 'text-white dark:text-black' : card.accentColor || 'text-gray-700 dark:text-zinc-300'
                      }`}
                    />
                  </div>
                  <h3 className="font-valve text-base font-bold mb-1 tracking-wide">
                    {card.title}
                  </h3>
                  <p
                    className={`text-xs leading-relaxed font-medium ${
                      card.highlighted ? 'text-white/85 dark:text-zinc-700' : 'text-gray-500 dark:text-zinc-400'
                    }`}
                  >
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sector Derecho: Marco de la Imagen Institucional (Sector delimitado) */}
        <div className="lg:col-span-5 w-full">
          <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-xl bg-gray-900 group">
            <img
              src="/sistema_asistencias.jpeg"
              alt="Sector Imagen Sistema Asistencias"
              className="w-full h-full object-cover object-center grayscale contrast-125 group-hover:scale-105 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-400 dark:text-zinc-600 font-medium text-center font-mono">
        v1.0.0
      </div>
    </div>
  );
}
