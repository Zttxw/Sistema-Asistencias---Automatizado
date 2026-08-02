import React from 'react';
import { CalendarCheck, LogIn, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Loader from './Loader';

export default function VisitanteHome({ onVerAsistencias, onOpenLogin }) {
  const { theme, toggleTheme } = useTheme();

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
      {/* Banner Superior de Animación Speeder ocupando 100% de ancho sin opacar */}
      <div className="w-full h-36 sm:h-40 relative mb-4">
        <Loader inline={true} />

        {/* Botón Tema Flotante sobre el Banner */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 transition-colors cursor-pointer shadow-xs"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
        </button>
      </div>

      {/* Header Gran Formato Vistoso y Elegante */}
      <div className="w-full max-w-2xl px-6 flex flex-col items-center my-auto">
        <div className="text-center mb-10">
          {/* Badge institucional superior */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/60 mb-4 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
            <span>Oficina de Tecnologías de la Información</span>
          </div>

          {/* Título Principal — Grande, Vistoso y Elegante */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Sistema de Control de Asistencias
          </h1>

          <p className="text-base text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto leading-relaxed">
            Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
          </p>
        </div>

        {/* Grid 2 tarjetas — Con Estilo Negro Elegante */}
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

      {/* Footer Elegante */}
      <div className="mt-8 text-xs text-gray-400 dark:text-gray-500 font-medium text-center">
        v1.0.0 &bull; OTI &bull; Gobierno del Perú
      </div>
    </div>
  );
}
