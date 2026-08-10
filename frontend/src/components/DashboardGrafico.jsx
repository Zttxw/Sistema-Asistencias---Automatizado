import React from 'react';

export default function DashboardGrafico({ asistencias = [], empleados = [] }) {
  // Colores Institucionales
  // Blue: #3484A5 | Green: #2CA792 | Gold: #F0C84F | Red: #E05656

  // Función inteligente para determinar si un empleado está presente en oficina en este momento
  const esEstaEnOficina = (a) => {
    if (!a || !a.hora_entrada) return false;
    if (a.origen_salida === 'manual') return false;
    if (!a.hora_salida) return true;

    try {
      const ahora = new Date();
      const parts = a.hora_salida.split(':');
      if (parts.length < 2) return true;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parts[2] ? parseInt(parts[2], 10) : 0;

      const ultimaDet = new Date();
      ultimaDet.setHours(h, m, s, 0);

      const diffMin = Math.abs((ahora - ultimaDet) / (1000 * 60));
      return diffMin <= 45;
    } catch (e) {
      return true;
    }
  };

  // 1. Cálculos generales
  const totalEmpleados = empleados.length;
  const presentesHoy = asistencias.filter(esEstaEnOficina);
  const totalAsistieron = asistencias.length;
  const ausentesHoy = Math.max(0, totalEmpleados - totalAsistieron);

  const pctAsistencia = totalEmpleados > 0 
    ? Math.round((totalAsistieron / totalEmpleados) * 100) 
    : 0;

  // 2. Mapeo Semáforo por Empleado con HORAS REALES ACUMULADAS DE LA BASE DE DATOS
  const empleadosSemaforo = empleados.map((emp) => {
    const asisEmp = asistencias.find((a) => a.empleado.trim().toLowerCase() === emp.nombre.trim().toLowerCase());
    const enOficina = asisEmp ? esEstaEnOficina(asisEmp) : false;
    const meta = emp.horas_meta || 640;
    
    // Horas acumuladas REALES desde el Backend
    const horasReales = emp.horas_acumuladas !== undefined && emp.horas_acumuladas !== null ? emp.horas_acumuladas : 0;
    const pctMeta = Math.min(100, Math.round((horasReales / meta) * 100));

    // Semáforo con colores institucionales
    let semaforo = {
      status: 'VERDE',
      colorHex: '#2CA792',
      badgeBg: 'rgba(44, 167, 146, 0.12)',
      badgeText: '#2CA792',
      badgeBorder: 'rgba(44, 167, 146, 0.3)',
    };

    if (pctMeta < 40) {
      semaforo = {
        status: 'ROJO',
        colorHex: '#E05656',
        badgeBg: 'rgba(224, 86, 86, 0.12)',
        badgeText: '#E05656',
        badgeBorder: 'rgba(224, 86, 86, 0.3)',
      };
    } else if (pctMeta < 75) {
      semaforo = {
        status: 'ÁMBAR',
        colorHex: '#F0C84F',
        badgeBg: 'rgba(240, 200, 79, 0.12)',
        badgeText: '#D9A726',
        badgeBorder: 'rgba(240, 200, 79, 0.3)',
      };
    }

    return {
      id: emp.id,
      nombre: emp.nombre,
      departamento: emp.departamento || 'OTI',
      enOficina,
      horasReales,
      meta,
      pctMeta,
      semaforo,
    };
  });

  // Ordenar de mayor a menor avance
  empleadosSemaforo.sort((a, b) => b.pctMeta - a.pctMeta);

  return (
    <div className="space-y-6 text-gray-900 dark:text-zinc-100 font-sans">
      
      {/* 🚦 DOS TARJETAS ULTRA-LIMPIAS DE ESTADO GENERAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* VERDE INSTITUCIONAL #2CA792: PRESENCIA AHORA */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full shadow-sm animate-pulse shrink-0" 
                style={{ backgroundColor: '#2CA792', boxShadow: '0 0 8px rgba(44, 167, 146, 0.6)' }}
              ></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                EN OFICINA AHORA (PRESENCIA)
              </span>
            </div>
            <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
              {presentesHoy.length} <span className="text-xs font-sans text-gray-400 font-normal">/ {totalEmpleados} personal</span>
            </p>
          </div>
          <span 
            className="text-xs font-mono font-bold px-3 py-1.5 rounded border"
            style={{ 
              backgroundColor: 'rgba(44, 167, 146, 0.1)', 
              color: '#2CA792', 
              borderColor: 'rgba(44, 167, 146, 0.3)' 
            }}
          >
            {pctAsistencia}% PRESENCIA HOY
          </span>
        </div>

        {/* ROJO ALERTA #E05656: PENDIENTES DE INGRESO */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: '#E05656', boxShadow: '0 0 8px rgba(224, 86, 86, 0.6)' }}
              ></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                PENDIENTES DE INGRESO HOY
              </span>
            </div>
            <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
              {ausentesHoy} <span className="text-xs font-sans text-gray-400 font-normal">sin registro hoy</span>
            </p>
          </div>
          <span 
            className="text-xs font-mono font-bold px-3 py-1.5 rounded border"
            style={{ 
              backgroundColor: 'rgba(224, 86, 86, 0.1)', 
              color: '#E05656', 
              borderColor: 'rgba(224, 86, 86, 0.3)' 
            }}
          >
            REVISIÓN
          </span>
        </div>

      </div>

      {/* SECCIÓN PRINCIPAL: MATRIZ DE CUMPLIMIENTO A ANCHO COMPLETO */}
      <div className="w-full bg-white dark:bg-zinc-950 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4 gap-3">
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3484A5' }}></span>
              MATRIZ SEMÁFORO DE CUMPLIMIENTO DE PRACTICANTES
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Control de horas acumuladas reales en base de datos vs Meta requerida (Tope 6.0 hrs/día).
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="flex items-center gap-1 font-semibold" style={{ color: '#2CA792' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2CA792' }}></span> Óptimo (≥75%)
            </span>
            <span className="flex items-center gap-1 font-semibold" style={{ color: '#D9A726' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F0C84F' }}></span> En Avance (40-74%)
            </span>
            <span className="flex items-center gap-1 font-semibold" style={{ color: '#E05656' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E05656' }}></span> Inicial (&lt;40%)
            </span>
          </div>
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {empleadosSemaforo.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 font-mono">No hay practicantes registrados en el sistema.</p>
          ) : (
            empleadosSemaforo.map((emp) => (
              <div 
                key={emp.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800/80 bg-gray-50/40 dark:bg-zinc-900/30 hover:bg-gray-100/50 dark:hover:bg-zinc-900/80 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
                      style={{ backgroundColor: emp.semaforo.colorHex }}
                    ></span>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-xs">{emp.nombre}</h3>
                        {emp.enOficina ? (
                          <span 
                            className="text-[10px] font-mono font-semibold"
                            style={{ color: '#2CA792' }}
                          >
                            [EN OFICINA]
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-600">
                            [FUERA]
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500">{emp.departamento}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{emp.horasReales.toFixed(1)} / {emp.meta} hrs</span>
                    </div>
                    <span 
                      className="text-xs font-bold px-2.5 py-0.5 rounded border"
                      style={{ 
                        backgroundColor: emp.semaforo.badgeBg, 
                        color: emp.semaforo.badgeText, 
                        borderColor: emp.semaforo.badgeBorder 
                      }}
                    >
                      {emp.pctMeta}%
                    </span>
                  </div>
                </div>

                {/* BARRA SEMÁFORO DE HORAS REALES ACUMULADAS */}
                <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded-none overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${emp.pctMeta}%`, 
                      backgroundColor: emp.semaforo.colorHex 
                    }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
