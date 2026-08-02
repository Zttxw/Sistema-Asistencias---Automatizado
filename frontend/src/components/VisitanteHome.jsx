import React from 'react';
import { CalendarCheck, LogIn } from 'lucide-react';
import Loader from './Loader';
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090B] flex flex-col items-center justify-between pb-12 relative overflow-x-hidden">
      {/* Banner Superior de Animación Speeder ocupando 100% de ancho */}
      <div className="w-full h-36 sm:h-40 relative mb-4">
        <Loader inline={true} />

        {/* Switch de Tema Animado Flotante sobre el Banner */}
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
      </div>

      {/* Header Gran Formato Vistoso y Elegante */}
      <div className="w-full max-w-2xl px-6 flex flex-col items-center my-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Sistema de Control de Asistencias
          </h1>

          <p className="text-base text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto leading-relaxed">
            Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
          </p>
        </div>

        {/* Grid 2 tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={card.onClick}
                className={`group text-left rounded-xl p-6 transition-all cursor-pointer ${
                  card.highlighted
                    ? 'bg-black text-white hover:bg-gray-900 dark:bg-black dark:text-white border border-black dark:border-gray-800 shadow-md'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 hover:border-black dark:hover:border-gray-700 shadow-2xs'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                    card.highlighted
                      ? 'bg-white/10 text-white'
                      : 'bg-gray-50 dark:bg-gray-800 group-hover:bg-black/5 dark:group-hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      card.highlighted ? 'text-white' : card.accentColor || 'text-gray-700 dark:text-gray-300'
                    }`}
                  />
                </div>
                <h3
                  className={`text-base font-bold mb-1 ${
                    card.highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-50'
                  }`}
                >
                  {card.title}
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    card.highlighted ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'
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
      <div className="mt-8 text-xs text-gray-400 dark:text-gray-500 font-medium text-center">
        v1.0.0
      </div>
    </div>
  );
}
