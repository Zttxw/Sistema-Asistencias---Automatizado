import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSignature,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Search,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';

export default function InformesSemanales() {
  const [empleados, setEmpleados] = useState([]);
  const [empSeleccionado, setEmpSeleccionado] = useState('');
  const [semanas, setSemanas] = useState([]);
  const [consolidado, setConsolidado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subiendoId, setSubiendoId] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // UX Filters
  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas' | 'pendientes' | 'firmadas'
  const [busqueda, setBusqueda] = useState('');

  // Cargar lista de empleados (Sin seleccionar por defecto)
  const fetchEmpleados = async () => {
    try {
      const res = await client.get('/api/empleados/');
      const activos = res.data.filter((e) => e.activo !== false);
      setEmpleados(activos);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de practicantes.');
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  const armarConsolidadoFallback = (listaSemanas) => {
    try {
      if (!listaSemanas || !Array.isArray(listaSemanas) || listaSemanas.length === 0) return null;
      const primera = listaSemanas[0];
      const ultima = listaSemanas[listaSemanas.length - 1];
      const totalHoras = listaSemanas.reduce((sum, s) => sum + (parseFloat(s?.horas_semana) || 0), 0);
      const todoFirmado = listaSemanas.length > 0 && listaSemanas.every((s) => s?.firmado);

      let inicioStr = primera?.semana_inicio || '';
      let finStr = ultima?.semana_fin || '';

      if (primera?.rango_str) {
        const partes1 = primera.rango_str.split(/[\-–—]/);
        if (partes1.length > 0 && partes1[0]) inicioStr = partes1[0].trim();
      }
      if (ultima?.rango_str) {
        const partes2 = ultima.rango_str.split(/[\-–—]/);
        if (partes2.length > 1 && partes2[1]) finStr = partes2[1].trim();
        else if (partes2.length > 0 && partes2[0]) finStr = partes2[0].trim();
      }

      return {
        semana_inicio: primera?.semana_inicio,
        semana_fin: ultima?.semana_fin,
        rango_str: `${inicioStr} – ${finStr}`,
        total_semanas: listaSemanas.length,
        total_horas: Math.round(totalHoras * 10) / 10,
        firmado: todoFirmado,
        informe_firmado_id: todoFirmado ? primera?.informe_firmado_id : null,
      };
    } catch (err) {
      console.error('Error en armarConsolidadoFallback:', err);
      return null;
    }
  };

  // Cargar semanas completadas solo cuando se selecciona un empleado
  const cargarSemanas = async (id) => {
    if (!id) {
      setSemanas([]);
      setConsolidado(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(`/api/informes-firmados/empleados/${id}/semanas-completadas`);
      const listaSemanas = Array.isArray(res.data) ? res.data : (res.data.semanas || []);
      const infoConsolidado = Array.isArray(res.data)
        ? armarConsolidadoFallback(listaSemanas)
        : (res.data.consolidado || armarConsolidadoFallback(listaSemanas));

      setSemanas(listaSemanas);
      setConsolidado(infoConsolidado);
    } catch (err) {
      console.error(err);
      setError('Error al obtener las semanas completadas del practicante.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empSeleccionado) {
      cargarSemanas(empSeleccionado);
    } else {
      setSemanas([]);
      setConsolidado(null);
    }
  }, [empSeleccionado]);

  // Descargar PDF preliminar de una semana
  const handleDescargarLimpio = async (semana) => {
    try {
      const empObj = empleados.find((e) => e.id === parseInt(empSeleccionado, 10));
      const nomLimpio = empObj ? empObj.nombre.replace(/\s+/g, '_') : 'Practicante';

      const res = await client.get(`/api/empleados/${empSeleccionado}/informe_pdf`, {
        params: { fecha_inicio: semana.semana_inicio, fecha_fin: semana.semana_fin, _t: Date.now() },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_semanal_${nomLimpio}_${semana.semana_inicio}_al_${semana.semana_fin}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError('Error al generar el documento PDF preliminar.');
    }
  };

  // Descargar PDF preliminar CONSOLIDADO (Semanas 1 a N)
  const handleDescargarConsolidadoLimpio = async () => {
    try {
      const empObj = empleados.find((e) => e.id === parseInt(empSeleccionado, 10));
      const nomLimpio = empObj ? empObj.nombre.replace(/\s+/g, '_') : 'Practicante';

      const res = await client.get(`/api/empleados/${empSeleccionado}/informe_pdf`, {
        params: consolidado
          ? { fecha_inicio: consolidado.semana_inicio, fecha_fin: consolidado.semana_fin, _t: Date.now() }
          : { _t: Date.now() },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_CONSOLIDADO_${nomLimpio}_1_a_${consolidado?.total_semanas || 'N'}_semanas.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError('Error al generar el documento PDF consolidado.');
    }
  };

  // Subir el PDF individual firmado
  const handleSubirPdfFirmado = async (semana, file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('El archivo seleccionado debe ser un documento PDF (*.pdf).');
      return;
    }

    setSubiendoId(semana.numero_semana);
    setError(null);
    setExito(null);

    const formData = new FormData();
    formData.append('semana_inicio', semana.semana_inicio);
    formData.append('semana_fin', semana.semana_fin);
    formData.append('archivo', file);

    try {
      await client.post(`/api/informes-firmados/empleados/${empSeleccionado}/subir`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExito(`Informe de la Semana ${semana.numero_semana} firmado y archivado correctamente.`);
      cargarSemanas(empSeleccionado);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al subir el PDF firmado.');
    } finally {
      setSubiendoId(null);
    }
  };

  // Subir el PDF CONSOLIDADO firmado
  const handleSubirConsolidadoFirmado = async (file) => {
    if (!file || !consolidado) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('El archivo seleccionado debe ser un documento PDF (*.pdf).');
      return;
    }

    setSubiendoId('consolidado');
    setError(null);
    setExito(null);

    const formData = new FormData();
    formData.append('semana_inicio', consolidado.semana_inicio);
    formData.append('semana_fin', consolidado.semana_fin);
    formData.append('archivo', file);

    try {
      await client.post(`/api/informes-firmados/empleados/${empSeleccionado}/subir`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExito(`Informe CONSOLIDADO (Semanas 1 a ${consolidado.total_semanas}) firmado y archivado correctamente.`);
      cargarSemanas(empSeleccionado);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al subir el informe PDF consolidado firmado.');
    } finally {
      setSubiendoId(null);
    }
  };

  // Descargar el PDF firmado guardado
  const handleDescargarFirmado = async (informeId, rangoStr) => {
    try {
      const res = await client.get(`/api/informes-firmados/${informeId}/descargar`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PDF_FIRMADO_${rangoStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError('No se pudo descargar el archivo PDF firmado.');
    }
  };

  const empActual = empleados.find((e) => e.id === parseInt(empSeleccionado, 10));
  const firmadasCount = semanas.filter((s) => s.firmado).length;
  const pendientesCount = semanas.filter((s) => !s.firmado).length;
  const infoConsolidado = consolidado || armarConsolidadoFallback(semanas);

  // Cálculos de horas
  const horasMeta = empActual?.horas_meta || 640;
  const horasAcumuladas = infoConsolidado?.total_horas || 0;
  const porcentajeHoras = Math.min(100, Math.round((horasAcumuladas / horasMeta) * 100));
  const horasRestantes = Math.max(0, Math.round((horasMeta - horasAcumuladas) * 10) / 10);

  // Filtrado de semanas
  const semanasFiltradas = useMemo(() => {
    return semanas.filter((s) => {
      if (filtroEstado === 'pendientes' && s.firmado) return false;
      if (filtroEstado === 'firmadas' && !s.firmado) return false;

      if (busqueda.trim() !== '') {
        const query = busqueda.toLowerCase();
        const coincideSemana = `semana ${s.numero_semana}`.includes(query) || `${s.numero_semana}`.includes(query);
        const coincideRango = s.rango_str.toLowerCase().includes(query);
        return coincideSemana || coincideRango;
      }
      return true;
    });
  }, [semanas, filtroEstado, busqueda]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 font-sans">
      {/* Encabezado Institucional Minimalista */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-[#3484A5]" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight font-mono uppercase">
              Informes Semanales & Firma Digital
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Oficina de Tecnologías de la Información &bull; Gestión e Inspección de Asistencias
          </p>
        </div>

        {empSeleccionado && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => cargarSemanas(empSeleccionado)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#3484A5] ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar Datos</span>
            </button>
          </div>
        )}
      </div>

      <AlertMessage message={error} onClose={() => setError(null)} />
      {exito && (
        <div className="p-3.5 bg-slate-900 text-slate-100 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-medium border border-slate-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exito}</span>
          </div>
          <button onClick={() => setExito(null)} className="font-bold text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Selector de Practicante */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
          Seleccionar Practicante / Empleado
        </label>
        <select
          value={empSeleccionado}
          onChange={(e) => setEmpSeleccionado(e.target.value)}
          className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg px-3.5 py-2 text-xs bg-slate-50/70 dark:bg-zinc-800/70 text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5] font-semibold cursor-pointer"
        >
          <option value="">-- Seleccionar Practicante / Empleado --</option>
          {empleados.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.nombre} ({emp.departamento || 'OTI'})
            </option>
          ))}
        </select>
      </div>

      {/* ESTADO INICIAL: CUANDO NO SE HA SELECCIONADO PRACTICANTE */}
      {!empSeleccionado ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-10 text-center shadow-2xs">
          <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-xl text-[#3484A5] flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-zinc-700">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-tight">
            Seleccione un Practicante
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
            Elija un practicante o empleado del menú desplegable superior para consultar su avance de horas y administrar firmas digitales.
          </p>
        </div>
      ) : (
        /* VISTA DETALLADA: SE MUESTRA TRAS LA SELECCIÓN */
        <>
          {/* Métricas e Indicadores de Horas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Barra de Avance de Horas */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                  Avance Meta de Horas
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 dark:bg-zinc-800 text-[#3484A5] border border-slate-200 dark:border-zinc-700">
                  {porcentajeHoras}% Completado
                </span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline justify-between mb-1 font-mono">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {horasAcumuladas} <span className="text-xs text-slate-400 font-normal">/ {horasMeta} hrs</span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    Restantes: {horasRestantes} hrs
                  </span>
                </div>

                {/* Barra de Progreso Minimalista */}
                <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#3484A5] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${porcentajeHoras}%` }}
                  />
                </div>
              </div>

              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                DNI: <b>{empActual?.documento || 'Sin DNI'}</b> &bull; Área: <b>{empActual?.departamento || 'OTI'}</b>
              </span>
            </div>

            {/* Resumen Semanas Firmadas vs Pendientes */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Estado de Informes
              </span>

              <div className="grid grid-cols-2 gap-3 my-1">
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/60 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">Firmadas</span>
                  <span className="text-lg font-bold text-[#1A5C50] dark:text-emerald-400 font-mono">{firmadasCount}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/60 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">Pendientes</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">{pendientesCount}</span>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                Total: {semanas.length} semanas concluidas
              </span>
            </div>
          </div>

          {/* INFORME CONSOLIDADO GENERAL */}
          {infoConsolidado && (
            <div className="p-4 bg-slate-900 dark:bg-black text-white rounded-xl border border-slate-800 shadow-2xs space-y-3 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#3484A5]" />
                  <div>
                    <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      {porcentajeHoras >= 100
                        ? `Informe Consolidado Final de Prácticas (Semanas 1 a ${infoConsolidado.total_semanas})`
                        : `Avance Consolidado (Semanas 1 a ${infoConsolidado.total_semanas} — Firma Semanal)`}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {porcentajeHoras >= 100
                        ? `Meta completada por ${empActual?.nombre || 'Practicante'}. Expediente listo para consolidado final.`
                        : `Prácticas en curso (${horasAcumuladas} / ${horasMeta} hrs). Firma habilitada por semana (Lunes a Viernes).`}
                    </p>
                  </div>
                </div>

                {porcentajeHoras >= 100 ? (
                  infoConsolidado.firmado ? (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0 self-start sm:self-auto flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      CONSOLIDADO FINAL FIRMADO
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 self-start sm:self-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      CONSOLIDADO PENDIENTE
                    </span>
                  )
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 shrink-0 self-start sm:self-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    EN CURSO (FIRMA SEMANAL)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 font-mono block text-[10px]">Rango Registrado</span>
                  <span className="font-mono font-bold text-white">{infoConsolidado.rango_str}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block text-[10px]">Semanas Concluidas</span>
                  <span className="font-mono font-bold text-white">{infoConsolidado.total_semanas} semana(s)</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block text-[10px]">Horas Acumuladas</span>
                  <span className="font-mono font-bold text-emerald-400">{infoConsolidado.total_horas} / {horasMeta} hrs</span>
                </div>
              </div>

              {/* Acciones Consolidado */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleDescargarConsolidadoLimpio}
                  className="px-3.5 py-2 bg-[#3484A5] hover:bg-[#2b6f8b] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Descargar reporte PDF unificado"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Reporte PDF (1 a {infoConsolidado.total_semanas} semanas)</span>
                </button>

                {infoConsolidado.firmado ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDescargarFirmado(infoConsolidado.informe_firmado_id, 'CONSOLIDADO')}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Consolidado Firmado</span>
                    </button>

                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors border border-slate-700">
                      <span>Reemplazar</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => handleSubirConsolidadoFirmado(e.target.files[0])}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200">
                    <Upload className="w-3.5 h-3.5 text-slate-700" />
                    <span>{subiendoId === 'consolidado' ? 'Guardando...' : 'Subir Consolidado Firmado'}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={subiendoId === 'consolidado'}
                      className="hidden"
                      onChange={(e) => handleSubirConsolidadoFirmado(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* DESGLOSE INDIVIDUAL CON PESTAÑAS Y BUSCADOR */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
            {/* Control Superior */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-950">
              {/* Pestañas de Estado */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/50 dark:bg-zinc-800/80 rounded-lg text-xs font-mono">
                <button
                  onClick={() => setFiltroEstado('todas')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    filtroEstado === 'todas'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todas ({semanas.length})
                </button>

                <button
                  onClick={() => setFiltroEstado('pendientes')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    filtroEstado === 'pendientes'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Pendientes ({pendientesCount})</span>
                </button>

                <button
                  onClick={() => setFiltroEstado('firmadas')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    filtroEstado === 'firmadas'
                      ? 'bg-[#1A5C50] text-white font-bold shadow-2xs'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Firmadas ({firmadasCount})</span>
                </button>
              </div>

              {/* Buscador */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar semana o fecha..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5]"
                />
              </div>
            </div>

            {/* Listado de Semanas */}
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400 font-mono">
                Cargando registros...
              </div>
            ) : semanasFiltradas.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500 dark:text-zinc-400 font-mono space-y-1">
                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                  {filtroEstado === 'pendientes'
                    ? 'No hay semanas pendientes de firma.'
                    : 'No se encontraron semanas para el filtro seleccionado.'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {busqueda ? 'Modifique la búsqueda.' : 'Las semanas concluyen automáticamente los domingos.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {semanasFiltradas.map((semana) => (
                  <div
                    key={semana.numero_semana}
                    className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-zinc-300 shrink-0">
                        S{semana.numero_semana}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            Semana {semana.numero_semana}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                            ({semana.rango_str})
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono block mt-0.5">
                          Horas: <b className="text-slate-900 dark:text-white">{semana.horas_semana} hrs</b>
                        </span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {semana.firmado ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          FIRMADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          PENDIENTE
                        </span>
                      )}

                      <button
                        onClick={() => handleDescargarLimpio(semana)}
                        className="p-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        title="Descargar PDF preliminar de esta semana"
                      >
                        <Download className="w-3.5 h-3.5 text-[#3484A5]" />
                      </button>

                      {semana.firmado ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDescargarFirmado(semana.informe_firmado_id, semana.rango_str)}
                            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver Firmado</span>
                          </button>

                          <label className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 text-xs font-medium rounded-lg cursor-pointer transition-colors">
                            <span>Reemplazar</span>
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={(e) => handleSubirPdfFirmado(semana, e.target.files[0])}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-black text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{subiendoId === semana.numero_semana ? 'Guardando...' : 'Subir Firmado'}</span>
                          <input
                            type="file"
                            accept=".pdf"
                            disabled={subiendoId === semana.numero_semana}
                            className="hidden"
                            onChange={(e) => handleSubirPdfFirmado(semana, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
