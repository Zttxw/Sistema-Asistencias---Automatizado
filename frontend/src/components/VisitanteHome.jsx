import React, { useState, useEffect } from 'react';
import { LogIn, Calendar, RefreshCw, Edit3, CheckCircle, Users, UserCheck } from 'lucide-react';
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
      setAsistencias(Array.isArray(res.data) ? res.data : []);
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

  const safeAsistencias = Array.isArray(asistencias) ? asistencias : [];
  const presentesCount = safeAsistencias.filter((a) => a && !a.hora_salida).length;
  const completadosCount = safeAsistencias.filter((a) => a && a.hora_salida).length;

  return (
    <div className="w-screen h-screen m-0 p-0 bg-gray-50 dark:bg-black flex flex-col lg:flex-row overflow-hidden text-gray-900 dark:text-white font-sans">
      
      {/* MITAD IZQUIERDA */}
      <div className="w-full lg:w-1/2 h-64 sm:h-80 lg:h-full relative overflow-hidden shrink-0 flex flex-col justify-end p-8 sm:p-12 lg:p-14 text-left border-r border-gray-200 dark:border-zinc-800/80">
        
        {/* Imagen Modo Día */}
        <img
          src="/imagen-mododia.jpg"
          alt="Sistema de Asistencias"
          className="absolute inset-0 w-full h-full object-cover object-center dark:hidden"
        />

        {/* Imagen Modo Noche */}
        <img
          src="/imagen-modo-noche.jpeg"
          alt="Sistema de Asistencias"
          className="absolute inset-0 w-full h-full object-cover object-center hidden dark:block"
        />

        {/* Velo traslúcido */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none"></div>

        {/* Mensaje Principal */}
        <div className="relative z-10 space-y-3 max-w-xl">
          <h1 className="font-valve text-3xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-wide text-white leading-tight">
            Control de Asistencias
          </h1>

          <p className="text-xs sm:text-sm text-gray-200 max-w-lg font-normal leading-relaxed">
            Registro automatizado y monitoreo de presencia del personal.
          </p>
        </div>
      </div>

      {/* MITAD DERECHA */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 bg-white dark:bg-zinc-950 overflow-hidden">
        
        {/* 1. BARRA SUPERIOR DE ACCIONES */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Panel Público
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 text-xs font-medium rounded-lg transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar sesión</span>
            </button>

            <ThemeToggle />
          </div>
        </div>

        {/* 2. CABECERA DE ASISTENCIAS DEL DÍA */}
        <div className="pt-5 pb-3 shrink-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-valve text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                Asistencias de Hoy
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Personal registrado durante la jornada.
              </p>
            </div>

            {/* Fecha y Recarga */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-gray-800 dark:text-zinc-200">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>

              <button
                onClick={fetchAsistenciasHoy}
                className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen Rápido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Presentes</span>
              </div>
              <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">{presentesCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Jornada Completa</span>
              </div>
              <span className="text-lg font-mono font-bold text-gray-800 dark:text-zinc-200">{completadosCount}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <AlertMessage message={error} onClose={() => setError(null)} />
        </div>

        {/* 3. TABLA DE ASISTENCIAS DEL DÍA */}
        <div className="flex-1 overflow-y-auto my-2 pr-1 custom-scrollbar min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-xs text-gray-400 dark:text-zinc-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Cargando asistencias...</span>
            </div>
          ) : asistencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6 border border-gray-200 dark:border-zinc-800 rounded-lg bg-gray-50/50 dark:bg-zinc-900/30 space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                No hay marcaciones registradas el día de hoy.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-600 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2.5">Empleado</th>
                    <th className="px-4 py-2.5">Entrada</th>
                    <th className="px-4 py-2.5">Salida</th>
                    <th className="px-4 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-xs">
                  {asistencias.map((item, idx) => {
                    const isPresente = !item.hora_salida;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          <div className="font-semibold">{item.empleado}</div>
                          {item.departamento && (
                            <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{item.departamento}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 font-mono">
                          <span>{item.hora_entrada || '-'}</span>
                          {item.origen_entrada === 'manual' && (
                            <Edit3
                              className="inline-block w-3 h-3 ml-1 text-emerald-500 align-middle"
                              title={item.motivo ? `Entrada manual: ${item.motivo}` : 'Entrada manual'}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 font-mono">
                          <span>{item.hora_salida || '-'}</span>
                          {item.origen_salida === 'manual' && (
                            <Edit3
                              className="inline-block w-3 h-3 ml-1 text-emerald-500 align-middle"
                              title={item.motivo ? `Salida manual: ${item.motivo}` : 'Salida manual'}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPresente ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              <span>Presente</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800">
                              Completo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. PIE DE PÁGINA */}
        <div className="pt-3 border-t border-gray-200 dark:border-zinc-800 shrink-0 text-center text-[11px] text-gray-400 dark:text-zinc-500">
          <span>Sistema de Control de Asistencias</span>
        </div>

      </div>

    </div>
  );
}
