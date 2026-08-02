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

      {/* Contenido Central */}
      <div className="w-full max-w-4xl my-auto py-6 flex flex-col items-center">
        {/* Sector Ampliado de Imagen (Hero Banner) por detrás del Título */}
        <div className="w-full relative rounded-3xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-2xl mb-8 min-h-[300px] sm:min-h-[360px] flex items-center justify-center p-8 sm:p-12 text-center group">
          {/* Imagen Modo Día (Light Mode) en color original detrás del título */}
          <img
            src="/imagen-mododia.jpg"
            alt="Fondo Modo Día"
            className="absolute inset-0 w-full h-full object-cover object-center dark:hidden group-hover:scale-105 transition-transform duration-700"
          />

          {/* Imagen Modo Noche (Dark Mode) en color original detrás del título */}
          <img
            src="/imagen-modo-noche.jpeg"
            alt="Fondo Modo Noche"
            className="absolute inset-0 w-full h-full object-cover object-center hidden dark:block group-hover:scale-105 transition-transform duration-700"
          />

          {/* Velo traslúcido para legibilidad perfecta del título */}
          <div className="absolute inset-0 bg-white/70 dark:bg-black/75 backdrop-blur-[2px] transition-colors duration-300"></div>

          {/* Contenido del Título sobre la Imagen Ampliada */}
          <div className="relative z-10 max-w-2xl flex flex-col items-center">
            <h1 className="font-valve text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-wide leading-tight uppercase drop-shadow-sm">
              Sistema de Control de Asistencias
            </h1>

            <p className="text-sm sm:text-base text-gray-800 dark:text-zinc-200 mt-4 max-w-lg leading-relaxed font-medium">
              Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
            </p>
          </div>
        </div>

        {/* Grid de 2 Tarjetas por debajo del Sector del Título */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={card.onClick}
                className={`group text-left rounded-2xl p-7 transition-all cursor-pointer shadow-md ${
                  card.highlighted
                    ? 'bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 border border-primary dark:border-white shadow-lg'
                    : 'bg-white text-gray-900 dark:bg-black dark:text-white border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-zinc-500 shadow-2xs'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                    card.highlighted
                      ? 'bg-white/20 dark:bg-black/10 text-white dark:text-black'
                      : 'bg-gray-100 dark:bg-zinc-900 group-hover:bg-primary/10 dark:group-hover:bg-white/10'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      card.highlighted ? 'text-white dark:text-black' : card.accentColor || 'text-gray-700 dark:text-zinc-300'
                    }`}
                  />
                </div>
                <h3 className="font-valve text-lg font-bold mb-1.5 tracking-wide">
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

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-400 dark:text-zinc-600 font-medium text-center font-mono">
        v1.0.0
      </div>
    </div>
  );
}
