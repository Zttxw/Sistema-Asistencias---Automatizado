import React, { useState } from 'react';

export default function DashboardGrafico({ asistencias = [], empleados = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Presencia en vivo en oficina
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

  // 1. Métricas no redundantes
  const totalEmpleados = empleados.length;
  const presentesHoy = asistencias.filter(esEstaEnOficina);
  const pctPresencia = totalEmpleados > 0 ? Math.round((presentesHoy.length / totalEmpleados) * 100) : 0;

  // 2. Mapeo único por practicante
  const empleadosData = empleados.map((emp) => {
    const asisEmp = asistencias.find(
      (a) => a.empleado && a.empleado.trim().toLowerCase() === emp.nombre.trim().toLowerCase()
    );
    const enOficina = asisEmp ? esEstaEnOficina(asisEmp) : false;
    const meta = emp.horas_meta || 640;
    const horasReales = emp.horas_acumuladas !== undefined && emp.horas_acumuladas !== null ? emp.horas_acumuladas : 0;
    const pctMeta = Math.min(100, Math.round((horasReales / meta) * 100));

    return {
      id: emp.id,
      nombre: emp.nombre,
      departamento: emp.departamento || 'OTI',
      enOficina,
      horasReales,
      meta,
      pctMeta,
    };
  });

  // Ranking ordenado de mayor a menor horas reales acumuladas
  const ranking = [...empleadosData].sort((a, b) => b.horasReales - a.horasReales);

  // Totales consolidados
  const sumaHorasTotal = empleadosData.reduce((acc, curr) => acc + curr.horasReales, 0);
  const promedioHorasGlobal = empleadosData.length > 0 ? (sumaHorasTotal / empleadosData.length).toFixed(1) : '0.0';

  // Agrupamiento no redundante por Departamento
  const deptosMap = {};
  empleadosData.forEach((emp) => {
    const d = emp.departamento || 'OTI';
    if (!deptosMap[d]) {
      deptosMap[d] = { nombre: d, total: 0, horas: 0 };
    }
    deptosMap[d].total += 1;
    deptosMap[d].horas += emp.horasReales;
  });
  const deptosList = Object.values(deptosMap);
  const maxHorasDepto = Math.max(...deptosList.map((d) => d.horas), 1);

  // Filtro único por término de búsqueda
  const rankingFiltrado = ranking.filter(
    (emp) =>
      !searchTerm ||
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-gray-900 dark:text-zinc-100 font-sans">
      
      {/* KPI BARS (3 DATOS ÚNICOS NO REDUNDANTES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="bg-white dark:bg-black p-4 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase block font-semibold">
              Presencia en Oficina
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {presentesHoy.length} / {totalEmpleados}
            </span>
          </div>
          <span className="text-xs font-bold text-[#2CA792] bg-[#2CA792]/10 px-2.5 py-1 rounded border border-[#2CA792]/20">
            {pctPresencia}% Hoy
          </span>
        </div>

        <div className="bg-white dark:bg-black p-4 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase block font-semibold">
              Promedio de Horas
            </span>
            <span className="text-2xl font-bold text-[#3484A5]">
              {promedioHorasGlobal} hrs
            </span>
          </div>
          <span className="text-xs text-gray-400">Meta: 640 hrs</span>
        </div>

        <div className="bg-white dark:bg-black p-4 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase block font-semibold">
              Total Horas Equipo
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {sumaHorasTotal.toFixed(1)} hrs
            </span>
          </div>
          <span className="text-xs text-gray-400">{totalEmpleados} practicantes</span>
        </div>
      </div>

      {/* DOS GRÁFICOS COMPLEMENTARIOS NO REDUNDANTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO PRINCIPAL: HORAS ACUMULADAS Y PROGRESO POR PRACTICANTE */}
        <div className="lg:col-span-2 bg-white dark:bg-black p-5 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 gap-3">
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Avance de Horas Acumuladas por Practicante
              </h2>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                Progreso real acumulado en base de datos frente a la meta (640 hrs).
              </p>
            </div>

            {/* Buscador Integrado */}
            <input
              type="text"
              placeholder="Filtrar practicante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#3484A5] font-mono w-full sm:w-48"
            />
          </div>

          {/* Gráfico de Barras por Practicante */}
          <div className="space-y-3 font-mono text-xs max-h-[420px] overflow-y-auto pr-1">
            {rankingFiltrado.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No se encontraron registros.</p>
            ) : (
              rankingFiltrado.map((emp, idx) => (
                <div key={emp.id} className="p-3 bg-gray-50/50 dark:bg-zinc-950 rounded-lg border border-gray-100 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-400 w-6">#{idx + 1}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{emp.nombre}</span>
                      <span className="text-gray-400 text-[10px]">({emp.departamento})</span>
                      {emp.enOficina ? (
                        <span className="text-[#2CA792] font-bold text-[10px] bg-[#2CA792]/10 px-1.5 py-0.5 rounded">
                          En Oficina
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">Fuera</span>
                      )}
                    </div>

                    <span className="font-bold text-[#3484A5]">
                      {emp.horasReales.toFixed(1)} / {emp.meta} hrs ({emp.pctMeta}%)
                    </span>
                  </div>

                  {/* Barra Precisa de Progreso */}
                  <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-[#3484A5] rounded-full transition-all duration-300"
                      style={{ width: `${emp.pctMeta}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* GRÁFICO COMPLEMENTARIO: DISTRIBUCIÓN DE HORAS POR ÁREA */}
        <div className="bg-white dark:bg-black p-5 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-4 flex flex-col justify-between">
          <div className="border-b border-gray-100 dark:border-zinc-800 pb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Distribución por Departamento
            </h2>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Horas totales aportadas por cada área.
            </p>
          </div>

          <div className="space-y-4 font-mono text-xs flex-1 overflow-y-auto max-h-[360px]">
            {deptosList.map((d, idx) => {
              const pctDepto = Math.min(100, Math.round((d.horas / maxHorasDepto) * 100));
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 dark:text-white">{d.nombre}</span>
                    <span className="text-[#2CA792] font-bold">{d.horas.toFixed(1)} hrs</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-2.5 bg-[#2CA792] rounded-full transition-all duration-300"
                      style={{ width: `${pctDepto}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{d.total} practicante(s)</span>
                    <span>{pctDepto}% del máximo</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
