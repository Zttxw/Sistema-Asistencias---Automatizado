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
    <div className="min-h-screen relative flex flex-col items-center justify-between p-8 overflow-hidden text-gray-900 dark:text-white">
      {/* Imagen de fondo cubriendo toda la pantalla */}
      <img
        src="/sistema_asistencias.jpeg"
        alt="Fondo Sistema Asistencias"
        className="fixed inset-0 w-full h-full object-cover z-0"
      />

      {/* Capa de velo sutil que permite ver la imagen con total claridad */}
      <div className="fixed inset-0 bg-white/35 dark:bg-black/60 backdrop-blur-[2px] z-0"></div>

      {/* Switch de Tema Flotante */}
      <div className="absolute top-6 right-6 z-20 backdrop-blur-md bg-white/60 dark:bg-black/60 p-1.5 rounded-2xl border border-white/40 dark:border-zinc-800 shadow-sm">
        <ThemeToggle />
      </div>

      {/* Contenido Central sobre el Fondo */}
      <div className="w-full max-w-2xl px-6 flex flex-col items-center my-auto z-10">
        <div className="text-center mb-12">
          <h1 className="font-valve text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-wide leading-tight uppercase drop-shadow-md">
            Sistema de Control de Asistencias
          </h1>

          <p className="text-sm sm:text-base text-gray-900 dark:text-zinc-100 font-medium max-w-lg mx-auto mt-4 px-4 py-2 rounded-xl bg-white/60 dark:bg-black/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/80 shadow-xs leading-relaxed">
            Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
          </p>
        </div>

        {/* Grid 2 tarjetas con Glassmorphism nítido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={card.onClick}
                className={`group text-left rounded-2xl p-7 transition-all cursor-pointer shadow-xl backdrop-blur-md ${
                  card.highlighted
                    ? 'bg-primary/95 text-white hover:bg-primary dark:bg-white dark:text-black hover:dark:bg-zinc-100 border border-primary/30 dark:border-white'
                    : 'bg-white/90 text-gray-900 dark:bg-black/90 dark:text-white border border-gray-200/80 dark:border-zinc-800 hover:border-primary dark:hover:border-zinc-500'
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
                    card.highlighted ? 'text-white/90 dark:text-zinc-700' : 'text-gray-600 dark:text-zinc-400'
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
      <div className="mt-8 text-xs text-gray-700 dark:text-zinc-400 font-semibold text-center font-mono z-10 px-3 py-1 rounded-md bg-white/50 dark:bg-black/50 backdrop-blur-xs">
        v1.0.0
      </div>
    </div>
  );
}
