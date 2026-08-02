import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, Calendar, RefreshCw, Edit3 } from 'lucide-react';
import client from '../api/client';
import AlertMessage from './AlertMessage';
import ThemeToggle from './ThemeToggle';

export default function VisitanteHome({ onOpenLogin }) {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAsistenciasHoy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/api/asistencias/hoy');
      setAsistencias(res.data);
    } catch (err) {
      console.error('Error al cargar asistencias:', err);
      setError('No se pudieron cargar las asistencias del día.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsistenciasHoy();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-between pb-12 relative text-gray-900 dark:text-white font-sans">
      
      {/* Top Bar Institucional: Brand + Botón Iniciar Sesión + ThemeToggle */}
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

        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenLogin}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar sesión</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Hero Banner Principal con Fotografías Modo Día / Modo Noche */}
      <div className="w-full max-w-6xl px-6 py-2">
        <div className="relative w-full rounded-3xl overflow-hidden border border-gray-200/80 dark:border-zinc-800 shadow-2xl h-80 sm:h-[440px] flex items-center justify-center text-center px-8 sm:px-14">
          
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

          {/* Contenido DENTRO de la Imagen */}
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

      {/* Sección UNIFICADA: Tabla de Asistencias de Hoy directamente por debajo */}
      <div className="w-full max-w-6xl px-6 pt-6 pb-4 space-y-6">
        
        {/* Cabecera de Asistencias de Hoy */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="font-valve text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
              Asistencias de Hoy
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Presencia del personal en tiempo real para el día de hoy.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs shadow-2xs font-semibold text-gray-700 dark:text-zinc-200">
              <Calendar className="w-4 h-4 text-secondary" />
              <span>Día Actual (Hoy)</span>
            </div>

            <button
              onClick={fetchAsistenciasHoy}
              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Recargar asistencias"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <AlertMessage message={error} onClose={() => setError(null)} />

        {/* Tabla de Asistencias de Hoy Nítida y Elegante */}
        <div className="bg-white dark:bg-black border border-gray-200/80 dark:border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500 font-medium">
              Cargando presencia del personal...
            </div>
          ) : asistencias.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500 font-medium">
              No hay asistencias registradas para el día de hoy.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Empleado</th>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4">Hora Entrada</th>
                  <th className="px-6 py-4">Hora Salida</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {asistencias.map((item, idx) => {
                  const isPresente = !item.hora_salida;
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.empleado}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">{item.departamento || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs">
                        <span>{item.hora_entrada || '-'}</span>
                        {item.origen_entrada === 'manual' && (
                          <Edit3
                            className="inline-block w-3.5 h-3.5 ml-1.5 text-accent align-middle cursor-help"
                            title={item.motivo ? `Entrada manual: ${item.motivo}` : 'Entrada manual'}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs">
                        <span>{item.hora_salida || '-'}</span>
                        {item.origen_salida === 'manual' && (
                          <Edit3
                            className="inline-block w-3.5 h-3.5 ml-1.5 text-accent align-middle cursor-help"
                            title={item.motivo ? `Salida manual: ${item.motivo}` : 'Salida manual'}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isPresente ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">
                            Presente
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border border-transparent dark:border-zinc-800">
                            Completo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
