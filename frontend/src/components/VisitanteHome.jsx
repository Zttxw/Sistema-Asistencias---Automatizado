import React from 'react';
import { CalendarCheck, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function VisitanteHome({ onVerAsistencias }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-between p-6 sm:p-10 relative text-gray-900 dark:text-white overflow-x-hidden">
      {/* Switch de Tema Flotante */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Contenido Central: Layout Split de 2 Columnas */}
      <div className="w-full max-w-5xl my-auto py-6 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        
        {/* Sector Izquierdo: Título, Subtítulo y Único Botón 'Asistencias de Hoy' */}
        <div className="md:col-span-6 flex flex-col items-start space-y-6 text-left">
          <div>
            <h1 className="font-valve text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-wide leading-tight uppercase">
              Sistema de Control de Asistencias
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-400 mt-4 leading-relaxed font-medium">
              Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
            </p>
          </div>

          {/* Tarjeta Única: Asistencias de Hoy */}
          <div className="w-full pt-2">
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
        </div>

        {/* Sector Derecho: Imagen Nítida en Formato Cuadrado (Aspect Square) */}
        <div className="md:col-span-6 w-full flex justify-center">
          <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden border-2 border-gray-200/80 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 relative group">
            {/* Imagen Modo Día (Light Mode) en color 100% nítido sin difuminados ni filtros */}
            <img
              src="/imagen-mododia.jpg"
              alt="Sistema de Asistencias - Modo Día"
              className="w-full h-full object-cover object-center dark:hidden group-hover:scale-105 transition-transform duration-500"
            />
            {/* Imagen Modo Noche (Dark Mode) en color 100% nítido sin difuminados ni filtros */}
            <img
              src="/imagen-modo-noche.jpeg"
              alt="Sistema de Asistencias - Modo Noche"
              className="w-full h-full object-cover object-center hidden dark:block group-hover:scale-105 transition-transform duration-500"
            />
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
