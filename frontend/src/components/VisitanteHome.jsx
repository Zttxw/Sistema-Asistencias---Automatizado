import React from 'react';
import { CalendarCheck, LogIn, ShieldCheck, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function VisitanteHome({ onVerAsistencias, onOpenLogin }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-between pb-10 relative text-gray-900 dark:text-white overflow-x-hidden font-sans">
      
      {/* Top Bar Institucional Minimalista */}
      <header className="w-full max-w-6xl px-6 py-5 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-white/10 flex items-center justify-center border border-primary/20 dark:border-white/20">
            <ShieldCheck className="w-5 h-5 text-primary dark:text-white" />
          </div>
          <div>
            <h2 className="font-valve text-base font-bold tracking-wide text-gray-900 dark:text-white leading-tight">
              Sistema de Asistencias
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
              Gestión & Control
            </p>
          </div>
        </div>

        {/* Theme Toggle Flotante */}
        <div>
          <ThemeToggle />
        </div>
      </header>

      {/* Banner Hero Principal con Imágenes Día/Noche en Gran Formato */}
      <div className="w-full max-w-6xl px-6 my-auto py-4">
        <div className="relative w-full rounded-3xl overflow-hidden border border-gray-200/80 dark:border-zinc-800 shadow-2xl h-80 sm:h-[460px] flex items-center justify-center text-center px-8 sm:px-14">
          
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

          {/* Velo traslúcido elegante para legibilidad */}
          <div className="absolute inset-0 bg-black/45 dark:bg-black/60 pointer-events-none"></div>

          {/* Título en la Imagen */}
          <div className="relative z-10 max-w-3xl flex flex-col items-center">
            <h1 className="font-valve text-3xl sm:text-6xl font-black tracking-wide uppercase text-white drop-shadow-2xl leading-tight">
              Sistema de Control de Asistencias
            </h1>
            <p className="text-sm sm:text-base text-white/90 font-medium mt-4 max-w-xl mx-auto leading-relaxed drop-shadow-md">
              Plataforma institucional para la gestión y monitoreo en tiempo real de la presencia del personal.
            </p>
          </div>
        </div>
      </div>

      {/* Opciones del Menú Principal: Tarjetas Minimalistas de Acción */}
      <div className="w-full max-w-4xl px-6 my-auto pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          
          {/* Opción 1: Asistencias de Hoy */}
          <button
            onClick={onVerAsistencias}
            className="group text-left rounded-2xl p-6 transition-all cursor-pointer bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 border border-primary dark:border-white shadow-xl hover:shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 dark:bg-black/10 flex items-center justify-center text-white dark:text-black shrink-0">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-valve text-lg font-bold tracking-wide">
                  Asistencias de Hoy
                </h3>
                <p className="text-xs text-white/85 dark:text-zinc-700 font-medium mt-0.5">
                  Presencia del personal en tiempo real para el día de hoy.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white dark:text-black transform group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </button>

          {/* Opción 2: Iniciar Sesión */}
          <button
            onClick={onOpenLogin}
            className="group text-left rounded-2xl p-6 transition-all cursor-pointer bg-white text-gray-900 dark:bg-black dark:text-white hover:border-primary dark:hover:border-white border border-gray-200 dark:border-zinc-800 shadow-md hover:shadow-xl flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-900 group-hover:bg-primary/10 dark:group-hover:bg-white/10 flex items-center justify-center text-gray-700 dark:text-zinc-300 shrink-0">
                <LogIn className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-valve text-lg font-bold tracking-wide text-gray-900 dark:text-white">
                  Iniciar Sesión
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                  Accede al sistema con tu cuenta institucional.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-primary dark:group-hover:text-white transform group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </button>

        </div>
      </div>

      {/* Footer Minimalista */}
      <footer className="mt-8 pt-4 flex items-center space-x-4 text-xs text-gray-400 dark:text-zinc-500 font-medium">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span>Modo Visitante</span>
        </div>
        <span>•</span>
        <span className="font-mono">v1.0.0</span>
      </footer>

    </div>
  );
}
