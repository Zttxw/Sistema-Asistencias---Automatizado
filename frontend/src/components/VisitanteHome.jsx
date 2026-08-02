import React from 'react';
import { CalendarCheck, LogIn, Sun, Moon } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-8 relative">
      {/* Botón Tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Hero Header con la animación Speeder */}
      <div className="w-full max-w-lg mb-8">
        <Loader inline={true} />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
          Sistema de Control de Asistencias
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
          Oficina de Tecnologías de la Información — Gestión y Control del Personal
        </p>
      </div>

      {/* Grid 2 tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={card.onClick}
              className={`group text-left rounded-xl p-6 transition-all cursor-pointer ${
                card.highlighted
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50 hover:border-primary/40 dark:hover:border-primary/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                  card.highlighted
                    ? 'bg-white/20'
                    : 'bg-gray-50 dark:bg-gray-700 group-hover:bg-primary/5 dark:group-hover:bg-primary/10'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    card.highlighted ? 'text-white' : card.accentColor || 'text-gray-600 dark:text-gray-300'
                  }`}
                />
              </div>
              <h3
                className={`text-sm font-semibold mb-1 ${
                  card.highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-50'
                }`}
              >
                {card.title}
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  card.highlighted ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
        v1.0.0 &bull; OTI
      </div>
    </div>
  );
}
