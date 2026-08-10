import React, { useState } from 'react';
import { Search, Clock, CheckCircle2, AlertCircle, UserCheck, ShieldCheck, Laptop, Phone } from 'lucide-react';

export default function VistaPresenciaDia({ asistencias = [], empleados = [], fecha = '' }) {
  const [busqueda, setBusqueda] = useState('');

  // Helper de presencia en tiempo real
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

  // Mapear el estado del día de TODOS los empleados
  const listaDia = empleados.map((emp) => {
    const asis = asistencias.find(
      (a) => a.empleado.trim().toLowerCase() === emp.nombre.trim().toLowerCase()
    );

    const enOficina = asis ? esEstaEnOficina(asis) : false;
    const registroPrevio = Boolean(asis);

    return {
      id: emp.id,
      nombre: emp.nombre,
      documento: emp.documento,
      departamento: emp.departamento || 'OTI',
      mac: emp.mac,
      asis,
      enOficina,
      registroPrevio,
    };
  });

  // Filtrado por búsqueda
  const listaFiltrada = listaDia.filter(
    (item) =>
      item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.documento.includes(busqueda) ||
      item.departamento.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalEnOficina = listaDia.filter((i) => i.enOficina).length;
  const totalConRegistro = listaDia.filter((i) => i.registroPrevio).length;
  const totalPendientes = listaDia.length - totalConRegistro;

  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-zinc-100">
      
      {/* BARRA SUPERIOR DE RESUMEN Y BÚSQUEDA DEL DÍA */}
      <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#2CA792' }}></span>
            PRESENCIA DEL DÍA Y ASISTENCIAS EN VIVO ({fecha})
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Monitoreo en vivo de entradas, permanencia en oficina y marcas de salida.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Contador 1: En Oficina */}
          <div className="px-3 py-1.5 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-xs font-mono">
            <span className="text-gray-500 dark:text-zinc-400">En Oficina: </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalEnOficina}</span>
          </div>

          {/* Contador 2: Registrados Hoy */}
          <div className="px-3 py-1.5 rounded-lg border bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50 text-xs font-mono">
            <span className="text-gray-500 dark:text-zinc-400">Registrados: </span>
            <span className="font-bold text-sky-600 dark:text-sky-400">{totalConRegistro} / {listaDia.length}</span>
          </div>

          {/* Input Búsqueda */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar practicante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* REJILLA DE TARJETAS DE PRESENCIA EN VIVO DEL DÍA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listaFiltrada.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-gray-400 font-mono">
            No se encontraron practicantes para la búsqueda.
          </div>
        ) : (
          listaFiltrada.map((item) => {
            const asis = item.asis;
            const horaEntrada = asis?.hora_entrada ? asis.hora_entrada.slice(0, 5) : null;
            const horaSalida = asis?.hora_salida ? asis.hora_salida.slice(0, 5) : null;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  item.enOficina
                    ? 'bg-white dark:bg-zinc-950 border-emerald-500/40 shadow-xs'
                    : item.registroPrevio
                    ? 'bg-gray-50/70 dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800'
                    : 'bg-gray-50/30 dark:bg-zinc-900/10 border-dashed border-gray-200 dark:border-zinc-800/80 opacity-75'
                }`}
              >
                {/* Encabezado Tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase">{item.nombre}</h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">DNI: {item.documento} &bull; {item.departamento}</p>
                  </div>

                  {item.enOficina ? (
                    <span 
                      className="px-2.5 py-1 rounded text-[10px] font-mono font-bold border shrink-0"
                      style={{ 
                        backgroundColor: 'rgba(44, 167, 146, 0.12)', 
                        color: '#2CA792', 
                        borderColor: 'rgba(44, 167, 146, 0.3)' 
                      }}
                    >
                      [EN OFICINA]
                    </span>
                  ) : item.registroPrevio ? (
                    <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                      [JORNADA CONCLUIDA]
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded text-[10px] font-mono text-gray-400 dark:text-zinc-600 border border-gray-200 dark:border-zinc-800 shrink-0">
                      [PENDIENTE]
                    </span>
                  )}
                </div>

                {/* Detalles de Marcación */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-gray-100 dark:border-zinc-900">
                  <div className="bg-gray-50 dark:bg-zinc-900/60 p-2 rounded border border-gray-100 dark:border-zinc-800/60">
                    <span className="text-[10px] text-gray-400 uppercase block">Hora Entrada</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {horaEntrada ? horaEntrada : '--:--'}
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-zinc-900/60 p-2 rounded border border-gray-100 dark:border-zinc-800/60">
                    <span className="text-[10px] text-gray-400 uppercase block">Hora Salida</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {horaSalida ? horaSalida : '--:--'}
                    </span>
                  </div>
                </div>

                {/* Pie con Dirección MAC */}
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 dark:text-zinc-500 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    {item.mac}
                  </span>
                  <span>{asis ? `Origen: ${asis.origen_entrada || 'auto'}` : 'Sin conexión'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
