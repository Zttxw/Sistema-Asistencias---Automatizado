import React, { useState, useEffect } from 'react';
import { LogIn, Calendar, RefreshCw, Edit3, CheckCircle, Clock, ShieldCheck, Radio, Users, UserCheck } from 'lucide-react';
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

  const presentesCount = asistencias.filter((a) => !a.hora_salida).length;
  const completadosCount = asistencias.filter((a) => a.hora_salida).length;

  return (
    <div className="w-screen h-screen m-0 p-0 bg-gray-50 dark:bg-black flex flex-col lg:flex-row overflow-hidden text-gray-900 dark:text-white font-sans">
      
      {/* ================= MITAD IZQUIERDA (50% ANCHO, 100% ALTO, PEGADO A LA IZQUIERDA) ================= */}
      <div className="w-full lg:w-1/2 h-64 sm:h-80 lg:h-full relative overflow-hidden shrink-0 flex flex-col justify-between p-8 sm:p-12 lg:p-14 text-left border-r border-gray-200 dark:border-zinc-800/80">
        
        {/* Imagen Modo Día */}
        <img
          src="/imagen-mododia.jpg"
          alt="Sistema de Asistencias - Modo Día"
          className="absolute inset-0 w-full h-full object-cover object-center dark:hidden"
        />

        {/* Imagen Modo Noche */}
        <img
          src="/imagen-modo-noche.jpeg"
          alt="Sistema de Asistencias - Modo Noche"
          className="absolute inset-0 w-full h-full object-cover object-center hidden dark:block"
        />

        {/* Velo traslúcido simétrico */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 pointer-events-none"></div>

        {/* Top Tag en Imagen */}
        <div className="relative z-10">
          <span className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-black/40 backdrop-blur-md text-white text-xs font-medium uppercase tracking-wider rounded-none border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistema Seguro LAN</span>
          </span>
        </div>

        {/* Mensaje Principal sobre la Imagen */}
        <div className="relative z-10 space-y-4 max-w-xl">
          <h1 className="font-valve text-3xl sm:text-5xl lg:text-6xl font-black tracking-wide uppercase text-white drop-shadow-2xl leading-tight">
            Control de Asistencias
          </h1>

          <p className="text-xs sm:text-sm text-gray-200 max-w-lg font-normal leading-relaxed">
            Monitoreo automatizado en tiempo real para la detección y registro de presencia del personal.
          </p>
        </div>
      </div>

      {/* ================= MITAD DERECHA (50% ANCHO, 100% ALTO, ASISTENCIAS DEL DÍA) ================= */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 bg-white dark:bg-zinc-950 overflow-hidden">
        
        {/* 1. BARRA SUPERIOR DE ACCIONES (Iniciar Sesión + Theme Toggle) */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Panel Público de Lectura
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-black hover:dark:bg-zinc-100 text-xs font-bold uppercase tracking-wider rounded-none transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar sesión</span>
            </button>

            <ThemeToggle />
          </div>
        </div>

        {/* 2. CABECERA DE ASISTENCIAS DEL DÍA */}
        <div className="pt-5 pb-3 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-valve text-2xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-wide">
                  Asistencias de Hoy
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Personal detectado durante la jornada laboral activa.
              </p>
            </div>

            {/* Selector Fecha y Recarga */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-none px-3.5 py-2 text-xs font-mono font-bold text-gray-800 dark:text-zinc-200 uppercase">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>

              <button
                onClick={fetchAsistenciasHoy}
                className="p-2 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-none hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen Rápido (Presentes / Completados) */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-none">
              <div className="flex items-center space-x-2.5">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Presentes</span>
              </div>
              <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">{presentesCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-none">
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Jornada Completa</span>
              </div>
              <span className="text-lg font-mono font-black text-gray-800 dark:text-zinc-200">{completadosCount}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <AlertMessage message={error} onClose={() => setError(null)} />
        </div>

        {/* 3. TABLA / ESTADO DE ASISTENCIAS DEL DÍA (CON SCROLL INTERNO Y ALTURA DINÁMICA) */}
        <div className="flex-1 overflow-y-auto my-2 pr-1 custom-scrollbar min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center text-sm text-gray-400 dark:text-zinc-500 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
              <span className="font-medium text-xs uppercase tracking-wider">Sincronizando asistencias...</span>
            </div>
          ) : asistencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center p-8 border border-dashed border-gray-200 dark:border-zinc-800/80 rounded-none bg-gray-50/50 dark:bg-zinc-900/30 space-y-4">
              <div className="relative flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-none">
                <Radio className="w-7 h-7 text-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                  Escaneando red en tiempo real
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  No hay marcaciones registradas todavía hoy. Las detecciones del Agente de Asistencia aparecerán automáticamente aquí.
                </p>
              </div>

              <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-gray-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1">
                <span>Frecuencia de escaneo: 60s</span>
              </div>
            </div>
          ) : (
            <div className="rounded-none border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-[11px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-800">Empleado</th>
                    <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-800">Entrada</th>
                    <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-800">Salida</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {asistencias.map((item, idx) => {
                    const isPresente = !item.hora_salida;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-zinc-800">
                          <div className="font-semibold text-sm">{item.empleado}</div>
                          {item.departamento && (
                            <div className="text-xs text-gray-400 dark:text-zinc-500 font-normal mt-0.5">{item.departamento}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 dark:text-zinc-300 font-mono text-xs border-r border-gray-200 dark:border-zinc-800 font-semibold">
                          <span>{item.hora_entrada || '-'}</span>
                          {item.origen_entrada === 'manual' && (
                            <Edit3
                              className="inline-block w-3.5 h-3.5 ml-1.5 text-emerald-500 align-middle"
                              title={item.motivo ? `Entrada manual: ${item.motivo}` : 'Entrada manual'}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 dark:text-zinc-300 font-mono text-xs border-r border-gray-200 dark:border-zinc-800 font-semibold">
                          <span>{item.hora_salida || '-'}</span>
                          {item.origen_salida === 'manual' && (
                            <Edit3
                              className="inline-block w-3.5 h-3.5 ml-1.5 text-emerald-500 align-middle"
                              title={item.motivo ? `Salida manual: ${item.motivo}` : 'Salida manual'}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {isPresente ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-none text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                              <CheckCircle className="w-3 h-3" />
                              <span>Presente</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-none text-xs font-semibold bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 uppercase tracking-wider">
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

        {/* 4. PIE DE PÁGINA INFORMATIVO DE RED EN EL PANEL DERECHO */}
        <div className="pt-3 border-t border-gray-200 dark:border-zinc-800 shrink-0 flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500" />
            <span>Escáner de Red ARP Activo</span>
          </div>
          <div>
            <span>Puerto Backend: 8010</span>
          </div>
        </div>

      </div>

    </div>
  );
}
