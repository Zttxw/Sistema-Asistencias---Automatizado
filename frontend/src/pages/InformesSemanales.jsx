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
  UserCheck,
  Eye
} from 'lucide-react';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';
import ModalPerfilFirmante from '../components/ModalPerfilFirmante';
import ModalViewerPdf from '../components/ModalViewerPdf';

export default function InformesSemanales() {
  const [empleados, setEmpleados] = useState([]);
  const [empSeleccionado, setEmpSeleccionado] = useState('');
  const [semanas, setSemanas] = useState([]);
  const [consolidado, setConsolidado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subiendoId, setSubiendoId] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // Visor PDF Modal State
  const [viewerPdfState, setViewerPdfState] = useState({
    isOpen: false,
    pdfUrl: '',
    title: '',
    filename: '',
    onDownload: null,
  });

  // Perfil del Usuario Firmante Autenticado
  const [currentUser, setCurrentUser] = useState(null);
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);

  // UX Filters
  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas' | 'pendientes' | 'firmadas'
  const [busqueda, setBusqueda] = useState('');

  // Cargar lista de empleados y usuario autenticado
  const fetchEmpleados = async () => {
    try {
      const res = await client.get('/api/empleados/');
      const lista = Array.isArray(res.data) ? res.data : [];
      const activos = lista.filter((e) => e && e.activo !== false);
      setEmpleados(activos);

      const resMe = await client.get('/api/auth/me');
      setCurrentUser(resMe.data);
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

  // Previsualizar / Descargar PDF en el visor interno para evitar bloqueos del navegador
  const handleDescargarLimpio = async (semana) => {
    try {
      const empObj = empleados.find((e) => e.id === parseInt(empSeleccionado, 10));
      const nomLimpio = empObj ? empObj.nombre.replace(/\s+/g, '_') : 'Practicante';
      const filename = `informe_mes_${semana.numero_mes || semana.numero_semana}_${nomLimpio}_${semana.semana_inicio}_al_${semana.semana_fin}.pdf`;

      const res = await client.get(`/api/empleados/${empSeleccionado}/informe_pdf`, {
        params: { fecha_inicio: semana.semana_inicio, fecha_fin: semana.semana_fin, _t: Date.now() },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      
      setViewerPdfState({
        isOpen: true,
        pdfUrl: url,
        title: `Vista Previa del Informe — Mes ${semana.numero_mes || semana.numero_semana} (${semana.rango_str})`,
        filename,
        onDownload: () => {
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      });
    } catch (err) {
      console.error(err);
      setError('Error al generar el documento PDF preliminar.');
    }
  };


  // Previsualizar PDF firmado guardado en el visor modal
  const handleVerFirmado = async (informeId, rangoStr) => {
    try {
      const res = await client.get(`/api/informes-firmados/${informeId}/descargar`, {
        responseType: 'blob',
      });

      const filename = `PDF_FIRMADO_${rangoStr || 'informe'}.pdf`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));

      setViewerPdfState({
        isOpen: true,
        pdfUrl: url,
        title: `Previsualización de PDF Firmado Digitalmente (${rangoStr})`,
        filename,
        onDownload: () => {
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo abrir la previsualización del archivo PDF firmado.');
    }
  };

  // Subir el PDF firmado del Mes (4 semanas) y abrir previsualización
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
      const uploadRes = await client.post(`/api/informes-firmados/empleados/${empSeleccionado}/subir`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExito(`¡Informe del Mes ${semana.numero_mes || semana.numero_semana} (4 semanas) firmado por el Ingeniero y archivado correctamente!`);
      cargarSemanas(empSeleccionado);

      // Previsualizar automáticamente el PDF recién subido
      if (uploadRes.data && uploadRes.data.id) {
        handleVerFirmado(uploadRes.data.id, semana.rango_str);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al subir el PDF firmado.');
    } finally {
      setSubiendoId(null);
    }
  };

  const safeEmpleados = Array.isArray(empleados) ? empleados : [];
  const safeSemanas = Array.isArray(semanas) ? semanas : [];
  const empActual = safeEmpleados.find((e) => e && e.id === parseInt(empSeleccionado, 10));
  const firmadasCount = safeSemanas.filter((s) => s && s.firmado).length;
  const pendientesCount = safeSemanas.filter((s) => s && !s.firmado).length;
  const infoConsolidado = consolidado || armarConsolidadoFallback(semanas);

  // Cálculos de horas
  const horasMeta = empActual?.horas_meta || 640;
  const horasAcumuladas = infoConsolidado?.total_horas || 0;
  const porcentajeHoras = Math.min(100, Math.round((horasAcumuladas / horasMeta) * 100));
  const horasRestantes = Math.max(0, Math.round((horasMeta - horasAcumuladas) * 10) / 10);

  // Filtrado de semanas
  const semanasFiltradas = useMemo(() => {
    const safeList = Array.isArray(semanas) ? semanas : [];
    return safeList.filter((s) => {
      if (filtroEstado === 'pendientes' && s.firmado) return false;
      if (filtroEstado === 'firmadas' && !s.firmado) return false;

      if (busqueda.trim() !== '') {
        const query = busqueda.toLowerCase();
        const coincideSemana = `semana ${s.numero_semana || s.numero_mes}`.includes(query) || `${s.numero_semana || s.numero_mes}`.includes(query) || (s.nombre_mes && s.nombre_mes.toLowerCase().includes(query));
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
              Informes Mensuales & Firma Digital
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Oficina de Tecnologías de la Información &bull; Gestión e Inspección de Asistencias Mensuales
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPerfilModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white dark:bg-zinc-100 dark:text-black text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Perfil de Firma Jefatura</span>
          </button>
          {empSeleccionado && (
            <button
              onClick={() => cargarSemanas(empSeleccionado)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#3484A5] ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar Datos</span>
            </button>
          )}
        </div>
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
            Elija un practicante o empleado del menú desplegable superior para consultar sus meses concluidos y administrar firmas digitales mensuales.
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

            {/* Resumen Meses Firmados vs Pendientes */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Estado de Informes Mensuales
              </span>

              <div className="grid grid-cols-2 gap-3 my-1">
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/60 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">Firmados</span>
                  <span className="text-lg font-bold text-[#1A5C50] dark:text-emerald-400 font-mono">{firmadasCount}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700/60 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">Pendientes</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">{pendientesCount}</span>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                Total: {semanas.length} meses concluidos
              </span>
            </div>
          </div>

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
                  Todos ({semanas.length})
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
                  <span>Firmados ({firmadasCount})</span>
                </button>
              </div>

              {/* Buscador */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar mes o fecha..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5]"
                />
              </div>
            </div>

            {/* Listado de Meses */}
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400 font-mono">
                Cargando registros...
              </div>
            ) : semanasFiltradas.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500 dark:text-zinc-400 font-mono space-y-1">
                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                  {filtroEstado === 'pendientes'
                    ? 'No hay informes mensuales pendientes de firma.'
                    : 'No se encontraron meses para el filtro seleccionado.'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {busqueda ? 'Modifique la búsqueda.' : 'Los meses concluyen automáticamente el último día de cada mes.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {semanasFiltradas.map((semana, idx) => (
                  <div
                    key={semana.numero_mes || semana.numero_semana || idx}
                    className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-zinc-300 shrink-0">
                        M{semana.numero_mes || semana.numero_semana}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {semana.nombre_mes || `Mes ${semana.numero_mes || semana.numero_semana}`}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                            ({semana.rango_str})
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono block mt-0.5">
                          Horas del Mes: <b className="text-slate-900 dark:text-white">{semana.horas_mes || semana.horas_semana} hrs</b>
                        </span>
                      </div>
                    </div>

                    {/* Acciones Minimalistas */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {semana.firmado ? (
                        <div className="flex items-center gap-1.5">
                          {/* Estado Firmado */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Firmado</span>
                          </span>

                          {/* El Ojito para previsualizar el PDF firmado */}
                          <button
                            onClick={() => handleVerFirmado(semana.informe_firmado_id, semana.rango_str)}
                            className="p-1.5 text-[#3484A5] bg-[#3484A5]/10 hover:bg-[#3484A5]/20 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60 rounded-lg transition-colors cursor-pointer border border-[#3484A5]/30"
                            title="Ver / Previsualizar PDF firmado (Ojito)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Reemplazar archivo firmado (opcional) */}
                          <label
                            className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-zinc-800"
                            title="Reemplazar informe PDF firmado"
                          >
                            <Upload className="w-4 h-4" />
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={(e) => handleSubirPdfFirmado(semana, e.target.files[0])}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Botón Descargar PDF directo para firmar rápido */}
                          <button
                            onClick={() => handleDescargarLimpio(semana)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#3484A5]/40 hover:bg-[#3484A5]/10 text-[#3484A5] dark:text-sky-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Previsualizar PDF en pantalla completa para revisar o guardar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver / Previsualizar PDF</span>
                          </button>


                          {/* Botón Principal: Subir Firmado */}
                          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3484A5] hover:bg-[#2b6f8b] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{subiendoId === (semana.numero_mes || semana.numero_semana) ? 'Guardando...' : 'Subir Firmado'}</span>
                            <input
                              type="file"
                              accept=".pdf"
                              disabled={subiendoId === (semana.numero_mes || semana.numero_semana)}
                              className="hidden"
                              onChange={(e) => handleSubirPdfFirmado(semana, e.target.files[0])}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ModalPerfilFirmante
        isOpen={isPerfilModalOpen}
        onClose={() => setIsPerfilModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />

      <ModalViewerPdf
        isOpen={viewerPdfState.isOpen}
        onClose={() => setViewerPdfState((prev) => ({ ...prev, isOpen: false }))}
        pdfUrl={viewerPdfState.pdfUrl}
        title={viewerPdfState.title}
        filename={viewerPdfState.filename}
        onDownload={viewerPdfState.onDownload}
      />
    </div>
  );
}
