import React from 'react';
import { CalendarCheck, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function VisitanteHome({ onVerAsistencias }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-between p-6 sm:p-10 relative text-gray-900 dark:text-white overflow-x-hidden">
      {/* Switch de Tema Flotante */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Contenedor Principal Ampliado Extra Grande */}
      <div className="w-full max-w-5xl my-auto py-4">
        <div className="relative w-full rounded-3xl overflow-hidden border-2 border-gray-200 dark:border-zinc-800 shadow-2xl min-h-[560px] sm:min-h-[640px] flex flex-col items-center justify-center p-8 sm:p-16 text-center">
          
          {/* Imagen Modo Día (Light Mode) estática en color original */}
          <img
            src="/imagen-mododia.jpg"
            alt="Sistema de Asistencias - Modo Día"
            className="absolute inset-0 w-full h-full object-cover object-center dark:hidden"
          />

          {/* Imagen Modo Noche (Dark Mode) estática en color original */}
          <img
            src="/imagen-modo-noche.jpeg"
            alt="Sistema de Asistencias - Modo Noche"
            className="absolute inset-0 w-full h-full object-cover object-center hidden dark:block"
          />

          {/* Velo de degradado equilibrado para destacar los elementos internos */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/45 dark:from-black/85 dark:via-black/55 dark:to-black/65 pointer-events-none"></div>

          {/* Contenido DENTRO de la Imagen (Título, Subtítulo y Tarjeta de Asistencias) */}
          <div className="relative z-10 max-w-3xl flex flex-col items-center space-y-10 text-white">
            
            {/* Encabezado e Información Institucional */}
            <div className="space-y-4">
              <h1 className="font-valve text-4xl sm:text-6xl font-black tracking-wide leading-tight uppercase text-white drop-shadow-xl">
                Sistema de Control de Asistencias
              </h1>

              <p className="text-base sm:text-lg text-white/90 font-medium max-w-xl mx-auto leading-relaxed drop-shadow-md">
                Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
              </p>
            </div>

            {/* Tarjeta Única DENTRO de la Imagen: Asistencias de Hoy */}
            <button
              onClick={onVerAsistencias}
              className="group/btn text-left rounded-2xl p-6 sm:p-7 bg-white/95 text-gray-900 hover:bg-white dark:bg-black/90 dark:text-white dark:hover:bg-black border border-white/40 dark:border-zinc-700 shadow-2xl backdrop-blur-md transition-all cursor-pointer flex items-center justify-between max-w-lg w-full transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-lg">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-valve text-xl font-bold tracking-wide">
                    Asistencias de Hoy
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-300 font-medium">
                    Consulta la presencia del personal en tiempo real para el día de hoy.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-7 h-7 text-primary dark:text-white transform group-hover/btn:translate-x-1 transition-transform shrink-0 ml-3" />
            </button>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-400 dark:text-zinc-600 font-medium text-center font-mono">
        v1.0.0
      </div>
    </div>
  );
}
