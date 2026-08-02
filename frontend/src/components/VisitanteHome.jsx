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

      {/* Contenedor Principal Ampliado con Imagen de Fondo en el que se integran los Textos y la Tarjeta */}
      <div className="w-full max-w-4xl my-auto py-4">
        <div className="relative w-full rounded-3xl overflow-hidden border-2 border-gray-200 dark:border-zinc-800 shadow-2xl min-h-[480px] sm:min-h-[540px] flex flex-col items-center justify-center p-8 sm:p-14 text-center group">
          
          {/* Imagen Modo Día (Light Mode) en color original como fondo del contenedor */}
          <img
            src="/imagen-mododia.jpg"
            alt="Sistema de Asistencias - Modo Día"
            className="absolute inset-0 w-full h-full object-cover object-center dark:hidden group-hover:scale-105 transition-transform duration-700"
          />

          {/* Imagen Modo Noche (Dark Mode) en color original como fondo del contenedor */}
          <img
            src="/imagen-modo-noche.jpeg"
            alt="Sistema de Asistencias - Modo Noche"
            className="absolute inset-0 w-full h-full object-cover object-center hidden dark:block group-hover:scale-105 transition-transform duration-700"
          />

          {/* Velo de degradado equilibrado para destacar los elementos internos sin opacar la imagen */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/50 dark:from-black/85 dark:via-black/60 dark:to-black/70 pointer-events-none"></div>

          {/* Contenido DENTRO de la Imagen (Título, Subtítulo y Tarjeta de Asistencias) */}
          <div className="relative z-10 max-w-2xl flex flex-col items-center space-y-8 text-white">
            
            {/* Encabezado e Información Institucional */}
            <div className="space-y-3">
              <h1 className="font-valve text-3xl sm:text-5xl font-black tracking-wide leading-tight uppercase text-white drop-shadow-lg">
                Sistema de Control de Asistencias
              </h1>

              <p className="text-sm sm:text-base text-white/90 font-medium max-w-lg mx-auto leading-relaxed drop-shadow-md">
                Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
              </p>
            </div>

            {/* Tarjeta Única DENTRO de la Imagen: Asistencias de Hoy */}
            <button
              onClick={onVerAsistencias}
              className="group/btn text-left rounded-2xl p-6 bg-white/95 text-gray-900 hover:bg-white dark:bg-black/90 dark:text-white dark:hover:bg-black border border-white/40 dark:border-zinc-700 shadow-2xl backdrop-blur-md transition-all cursor-pointer flex items-center justify-between max-w-md w-full transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-md">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-valve text-lg font-bold tracking-wide">
                    Asistencias de Hoy
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-300 font-medium">
                    Consulta la presencia del personal en tiempo real para el día de hoy.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-primary dark:text-white transform group-hover/btn:translate-x-1 transition-transform shrink-0 ml-2" />
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
