import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Calendar,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Award,
  TrendingUp,
  FileText,
  UserCheck,
  Zap
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import AlertMessage from './AlertMessage';

export default function VistaPracticante({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab') || 'marcar';

  const [activeTab, setActiveTab] = useState(
    ['marcar', 'registros', 'avance'].includes(currentTabParam) ? currentTabParam : 'marcar'
  );

  useEffect(() => {
    if (['marcar', 'registros', 'avance'].includes(currentTabParam)) {
      setActiveTab(currentTabParam);
    }
  }, [currentTabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };
  const [loading, setLoading] = useState(false);
  const [asistencias, setAsistencias] = useState([]);
  const [semanasInfo, setSemanasInfo] = useState({ semanas: [], consolidado: null });
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [submittingMarcacion, setSubmittingMarcacion] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const fetchDatosPracticante = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener mi historial diario de asistencias
      const resAsis = await client.get('/api/asistencias/mias');
      setAsistencias(resAsis.data || []);

      // 2. Obtener mis semanas completadas e informe consolidado
      const resSemanas = await client.get('/api/informes-firmados/mis-semanas-completadas');
      setSemanasInfo(resSemanas.data || { semanas: [], consolidado: null });
    } catch (err) {
      console.error('Error al cargar datos del practicante:', err);
      setError('No se pudieron obtener sus registros de asistencia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatosPracticante();
  }, []);

  // Marcación rápida de ingreso o salida por la web
  const handleMarcarPropia = async (tipo) => {
    setSubmittingMarcacion(true);
    setError(null);
    setExito(null);
    try {
      await client.post('/api/asistencia/marcar_propia', null, {
        params: { tipo }
      });
      setExito(`¡Marcación de ${tipo.toUpperCase()} registrada exitosamente!`);
      fetchDatosPracticante();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || `Error al registrar su ${tipo}.`);
    } finally {
      setSubmittingMarcacion(false);
    }
  };

  // Obtener estado de marcación de hoy
  const hoyStr = new Date().toISOString().split('T')[0];
  const asistenciaHoy = asistencias.find((a) => a.fecha === hoyStr || (a.fecha && a.fecha.includes(hoyStr)));

  const entradaHoy = asistenciaHoy?.hora_entrada || null;
  const salidaHoy = asistenciaHoy?.hora_salida || null;

  // Cómputos de Horas y Progreso Meta
  const consolidado = semanasInfo?.consolidado;
  const horasMeta = 640; // Meta estándar de prácticas
  const horasAcumuladas = consolidado?.total_horas || 0;
  const porcentajeHoras = Math.min(100, Math.round((horasAcumuladas / horasMeta) * 100));
  const horasRestantes = Math.max(0, Math.round((horasMeta - horasAcumuladas) * 10) / 10);

  // Filtrar tabla diaria
  const asistenciasFiltradas = asistencias.filter((a) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      a.fecha.includes(q) ||
      (a.dia_semana && a.dia_semana.toLowerCase().includes(q))
    );
  });

  // Visualizar / Descargar PDF (Informe Firmado o Reporte Generado)
  const handleVerPdf = async (informeId, fechaInicio, fechaFin, nombreArchivo) => {
    try {
      const params = {};
      if (informeId) params.informe_id = informeId;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;

      const res = await client.get('/api/informes-firmados/mi-informe-pdf', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      // Abrir en nueva pestaña para visualización e impresión
      const pdfWin = window.open(blobUrl, '_blank');
      if (!pdfWin) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = nombreArchivo || 'informe_asistencia.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Error al cargar PDF:', err);
      alert('No se pudo cargar el documento PDF. Verifique que existan asistencias registradas.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* Encabezado Principal del Practicante */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-mono uppercase">
            Portal del Practicante
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-mono">
            {user?.email} &bull; Control personal de marcación web, historial y avance de horas.
          </p>
        </div>

        <button
          onClick={fetchDatosPracticante}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#3484A5] ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      <AlertMessage message={error} onClose={() => setError(null)} />
      {exito && (
        <div className="p-4 bg-slate-900 text-slate-100 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-medium border border-slate-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exito}</span>
          </div>
          <button onClick={() => setExito(null)} className="font-bold text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Renderizado directo controlado por el Menú Lateral Izquierdo */}

      {/* ================= PESTAÑA 1: MARCAR ASISTENCIA (LO PRINCIPAL AL ENTRAR) ================= */}
      {activeTab === 'marcar' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                  Marcación Web Instantánea (Sin Celular)
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Registre su hora de ingreso o salida del día si no porta su teléfono móvil o el escáner de red no detectó su MAC.
                </p>
              </div>

              <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-700 dark:text-zinc-300 shrink-0 self-start md:self-auto">
                Fecha del Servidor: <b className="text-slate-900 dark:text-white">{hoyStr}</b>
              </div>
            </div>

            {/* Panel de Estado de Hoy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-2 bg-slate-50 dark:bg-zinc-950 p-4 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Hora Entrada Registrada:</span>
                  <span className={`font-bold ${entradaHoy ? 'text-[#3484A5]' : 'text-slate-400'}`}>
                    {entradaHoy || 'Pendiente de marcado'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400">Hora Salida Registrada:</span>
                  <span className={`font-bold ${salidaHoy ? 'text-[#3484A5]' : 'text-slate-400'}`}>
                    {salidaHoy || 'Pendiente de marcado'}
                  </span>
                </div>
              </div>

              {/* Botones de Marcación Sobrios e Institucionales */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleMarcarPropia('entrada')}
                  disabled={submittingMarcacion || !!entradaHoy}
                  className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold transition-all text-center cursor-pointer shadow-2xs ${
                    entradaHoy
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 border border-slate-200 dark:border-zinc-800 cursor-not-allowed'
                      : 'bg-[#3484A5] hover:bg-[#2b6f8b] text-white border border-[#2b6f8b]'
                  }`}
                >
                  {submittingMarcacion ? 'Registrando...' : entradaHoy ? 'Ingreso Registrado' : 'MARCAR INGRESO'}
                </button>

                <button
                  onClick={() => handleMarcarPropia('salida')}
                  disabled={submittingMarcacion || !entradaHoy || !!salidaHoy}
                  className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold transition-all text-center cursor-pointer shadow-2xs ${
                    !entradaHoy || salidaHoy
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 border border-slate-200 dark:border-zinc-800 cursor-not-allowed'
                      : 'bg-slate-800 dark:bg-zinc-700 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  {submittingMarcacion ? 'Registrando...' : salidaHoy ? 'Jornada Concluida' : 'MARCAR SALIDA'}
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resumen Rápido de Horas */}
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Resumen de Avance
              </span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{horasAcumuladas} hrs</span>
                <span className="text-xs text-slate-500 font-normal">acumuladas de {horasMeta} hrs meta</span>
              </div>
            </div>

            <div className="w-full md:w-64 space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-zinc-400">
                <span>{porcentajeHoras}% Avanzado</span>
                <span>Faltan {horasRestantes} hrs</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#3484A5] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeHoras}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PESTAÑA 2: HISTORIAL DE REGISTROS ================= */}
      {activeTab === 'registros' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-950">
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                Mi Historial Diario de Asistencias
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Registros de horas trabajadas por cada día hábil (Lunes a Viernes).
              </p>
            </div>

            {/* Buscador de fecha */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar fecha..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              Cargando historial de asistencias...
            </div>
          ) : asistenciasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-zinc-400 font-mono">
              No se encontraron asistencias registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 text-[11px]">
                    <th className="py-3 px-5 font-bold">Fecha / Día</th>
                    <th className="py-3 px-5 font-bold text-center">Hora Entrada</th>
                    <th className="py-3 px-5 font-bold text-center">Hora Salida</th>
                    <th className="py-3 px-5 font-bold text-right">Horas Computadas</th>
                    <th className="py-3 px-5 font-bold text-center">Origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-800 dark:text-zinc-200">
                  {asistenciasFiltradas.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-5 font-semibold">
                        {row.dia_semana ? `${row.dia_semana} ` : ''}{row.fecha}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {row.hora_entrada ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                            {row.hora_entrada}
                          </span>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {row.hora_salida ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                            {row.hora_salida}
                          </span>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-[#3484A5]">
                        {row.horas_computables ? `${row.horas_computables} hrs` : '0.0 hrs'}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                          {row.origen_entrada || 'automático'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= PESTAÑA 3: MI AVANCE & RANKING (INFORMES FIRMADOS VISTA/DESCARGA) ================= */}
      {activeTab === 'avance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Avance Detallado Meta de Horas */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#3484A5]" />
                  <span>Cómputo de Meta de Prácticas</span>
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-slate-100 dark:bg-zinc-800 text-[#3484A5] border border-slate-200 dark:border-zinc-700">
                  {porcentajeHoras}% Completado
                </span>
              </div>

              <div className="space-y-2 font-mono">
                <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400">
                  <span>Horas Acumuladas Actuales:</span>
                  <b className="text-slate-900 dark:text-white">{horasAcumuladas} hrs</b>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400">
                  <span>Meta Total Requerida:</span>
                  <b className="text-slate-900 dark:text-white">{horasMeta} hrs</b>
                </div>
                <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <span>Horas Restantes para Concluir:</span>
                  <b className="font-bold">{horasRestantes} hrs</b>
                </div>
              </div>

              {/* Barra de Progreso Grande */}
              <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#3484A5] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeHoras}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-400 font-mono pt-1">
                * Las horas se acumulan exclusivamente de Lunes a Viernes con un tope máximo de 6.0 horas computables por jornada.
              </p>
            </div>

            {/* Informes Semanales Respaldados */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#3484A5]" />
                  <span>Resumen de Informes de 4 Semanas</span>
                </span>
                <span className="text-xs font-mono text-slate-400">OTI</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-lg border border-slate-200 dark:border-zinc-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">Bloques Concluidos</span>
                  <span className="text-2xl font-bold text-[#3484A5] font-mono">{semanasInfo.semanas.length}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-lg border border-slate-200 dark:border-zinc-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">Informes Firmados</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {semanasInfo.semanas.filter((s) => s.firmado).length}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-600 dark:text-zinc-400">
                <span>Estado Actual: </span>
                <b className="text-slate-900 dark:text-white">
                  {horasAcumuladas >= horasMeta ? 'META CONCLUIDA' : 'EN CURSO (REGISTRO DÍA A DÍA)'}
                </b>
              </div>
            </div>
          </div>

          {/* TABLA DE INFORMES FIRMADOS DIGITALMENTE (SOLO VISTA / DESCARGA DE PDF POR EL PRACTICANTE) */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                Informes de 4 Semanas Firmados por el Ingeniero Responsable
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Consulte y descargue sus informes PDF oficiales de 4 semanas firmados digitalmente para impresión o trámite. (Vista de lectura).
              </p>
            </div>

            {semanasInfo.semanas.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 font-mono">
                No hay meses concluidos registrados hasta la fecha.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 text-[11px]">
                      <th className="py-3 px-5 font-bold">Mes / Rango</th>
                      <th className="py-3 px-5 font-bold text-center">Horas Acumuladas</th>
                      <th className="py-3 px-5 font-bold text-center">Estado de Firma</th>
                      <th className="py-3 px-5 font-bold text-right">Documento PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-800 dark:text-zinc-200">
                    {semanasInfo.semanas.map((sem, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-5 font-semibold">
                          {sem.nombre_mes || `Mes ${sem.numero_mes || sem.numero_semana}`} ({sem.rango_str})
                        </td>
                        <td className="py-3 px-5 text-center font-bold text-[#3484A5]">
                          {sem.horas_mes || sem.horas_semana} hrs
                        </td>
                        <td className="py-3 px-5 text-center">
                          {sem.firmado ? (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-900 text-white dark:bg-zinc-100 dark:text-black">
                              FIRMADO DIGITALMENTE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 border border-slate-200 dark:border-zinc-700">
                              Pendiente de Firma
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => handleVerPdf(sem.informe_firmado_id, sem.semana_inicio, sem.semana_fin, sem.nombre_archivo)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                              sem.firmado
                                ? 'bg-[#3484A5] hover:bg-[#2b6f8b] text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {sem.firmado ? 'Ver PDF Firmado' : 'Ver / Imprimir PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
