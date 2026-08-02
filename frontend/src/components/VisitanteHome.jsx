import React from 'react';
import { CalendarCheck, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function VisitanteHome({ onVerAsistencias }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-between pb-12 relative text-gray-900 dark:text-white overflow-x-hidden">
      
      {/* Banner Superior 100% Ancho con Altura Ampliada Extra Grande (h-96 sm:h-[540px]) */}
      <div className="w-full h-96 sm:h-[540px] relative overflow-hidden border-b border-gray-200 dark:border-zinc-800 shadow-xl flex items-center justify-center text-center px-8 sm:px-12">
        
        {/* Imagen Modo Día (Light Mode) en color original */}
        <img
          src="/imagen-mododia.jpg"
          alt="Sistema de Asistencias - Modo Día"
          className="absolute inset-0 w-full h-full object-cover object-center dark:hidden"
        />

        {/* Imagen Modo Noche (Dark Mode) en color original */}
        <img
          src="/imagen-modo-noche.jpeg"
          alt="Sistema de Asistencias - Modo Noche"
          className="absolute inset-0 w-full h-full object-cover object-center hidden dark:block"
        />

        {/* Velo traslúcido elegante para contraste del título */}
        <div className="absolute inset-0 bg-black/45 dark:bg-black/60 pointer-events-none"></div>

        {/* Único Elemento DENTRO de la Imagen: El Título en Gran Formato */}
        <h1 className="relative z-10 font-valve text-4xl sm:text-7xl font-black tracking-wide uppercase text-white drop-shadow-2xl max-w-5xl leading-tight">
          Sistema de Control de Asistencias
        </h1>

        {/* Switch de Tema Flotante sobre el Banner */}
        <div className="absolute top-6 right-6 z-20 backdrop-blur-md bg-black/30 p-1.5 rounded-full border border-white/20">
          <ThemeToggle />
        </div>
      </div>

      {/* Contenido POR DEBAJO (Fuera de la Imagen) */}
      <div className="w-full max-w-xl px-6 flex flex-col items-center my-auto space-y-8 text-center pt-8">
        
        {/* Subtítulo Institucional */}
        <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">
          Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
        </p>

        {/* Tarjeta Única: Asistencias de Hoy */}
        <button
          onClick={onVerAsistencias}
          className="w-full group text-left rounded-2xl p-6 transition-all cursor-pointer bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 border border-primary dark:border-white shadow-xl hover:shadow-2xl flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 dark:bg-black/10 flex items-center justify-center text-white dark:text-black shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-valve text-lg font-bold tracking-wide">
                Asistencias de Hoy
              </h3>
              <p className="text-xs text-white/85 dark:text-zinc-700 font-medium">
                Consulta la presencia del personal en tiempo real para el día de hoy.
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white dark:text-black transform group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
        </button>

      </div>

      {/* Footer */}
      <div className="mt-8 text-xs text-gray-400 dark:text-zinc-600 font-medium text-center font-mono">
        v1.0.0
      </div>
    </div>
  );
}
