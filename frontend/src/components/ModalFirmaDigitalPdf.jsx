import React, { useState, useEffect } from 'react';
import { Download, Upload, CheckCircle2, Clock, FileText, AlertCircle, RefreshCw, Layers, Sparkles, Eye } from 'lucide-react';
import Modal from './Modal';
import client from '../api/client';
import AlertMessage from './AlertMessage';
import ModalViewerPdf from './ModalViewerPdf';

export default function ModalFirmaDigitalPdf({ isOpen, onClose, empleados = [] }) {
  const [empId, setEmpId] = useState('');
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

  useEffect(() => {
    if (empleados.length > 0 && !empId) {
      setEmpId(empleados[0].id);
    }
  }, [empleados]);

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

  const cargarSemanasCompletadas = async (selectedId) => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(`/api/informes-firmados/empleados/${selectedId}/semanas-completadas`);
      const listaSemanas = Array.isArray(res.data) ? res.data : (res.data.semanas || []);
      const infoConsolidado = Array.isArray(res.data) ? armarConsolidadoFallback(listaSemanas) : (res.data.consolidado || armarConsolidadoFallback(listaSemanas));
      setSemanas(listaSemanas);
      setConsolidado(infoConsolidado);
    } catch (err) {
      console.error(err);
      setError('Error al consultar las semanas completadas del practicante.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && empId) {
      cargarSemanasCompletadas(empId);
    }
  }, [isOpen, empId]);

  const handleDescargarPdfLimpio = async (semana) => {
    try {
      const empSel = empleados.find((e) => e.id === parseInt(empId, 10));
      const nomLimpio = empSel ? empSel.nombre.replace(/\s+/g, '_') : 'Practicante';
      const filename = `informe_mes_${semana.numero_mes || semana.numero_semana}_${nomLimpio}_${semana.semana_inicio}_al_${semana.semana_fin}.pdf`;

      const res = await client.get(`/api/empleados/${empId}/informe_pdf`, {
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
      setError('No se pudo abrir el informe PDF preliminar.');
    }
  };


  const handleDescargarPdfFirmado = async (informeId, semanaStr) => {
    try {
      const res = await client.get(`/api/informes-firmados/${informeId}/descargar`, {
        responseType: 'blob',
      });

      const filename = `PDF_FIRMADO_${semanaStr || 'informe'}.pdf`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));

      setViewerPdfState({
        isOpen: true,
        pdfUrl: url,
        title: `Previsualización de PDF Firmado Digitalmente (${semanaStr})`,
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
      const uploadRes = await client.post(`/api/informes-firmados/empleados/${empId}/subir`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExito(`¡Informe del Mes ${semana.numero_mes || semana.numero_semana} (4 semanas) guardado exitosamente con la Firma Digital del Ingeniero!`);
      cargarSemanasCompletadas(empId);

      // Previsualizar automáticamente el informe firmado recién subido
      if (uploadRes.data && uploadRes.data.id) {
        handleDescargarPdfFirmado(uploadRes.data.id, semana.rango_str || semana.semana_inicio);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al subir el informe PDF firmado.');
    } finally {
      setSubiendoId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Informes Mensuales (4 Semanas) & Firma Digital">
      <div className="space-y-5 text-gray-900 dark:text-zinc-100 font-sans">
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          Descargue el informe PDF del mes (4 semanas). Fírmelo digitalmente y súbalo para que quede archivado oficialmente con 1 sola firma del Ingeniero Responsable.
        </p>

        <AlertMessage message={error} onClose={() => setError(null)} />
        {exito && (
          <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
            <span>{exito}</span>
            <button onClick={() => setExito(null)} className="font-bold text-emerald-800 dark:text-emerald-200">✕</button>
          </div>
        )}

        {/* Seleccionar Practicante */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">Practicante / Empleado:</label>
          <select
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-medium"
          >
            {empleados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} ({emp.departamento || 'OTI'})
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Semanas Concluidas */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Desglose de Meses Concluidos ({semanas.length})
            </h3>
            <button
              onClick={() => cargarSemanasCompletadas(empId)}
              className="text-xs text-primary dark:text-white flex items-center gap-1 hover:underline font-mono"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400 font-mono">Cargando meses completados...</div>
          ) : semanas.length === 0 ? (
            <div className="p-6 bg-gray-50 dark:bg-zinc-900/40 rounded-lg text-center text-xs text-gray-500 dark:text-zinc-400 font-mono border border-dashed border-gray-200 dark:border-zinc-800">
              No hay meses completados pasados aún para este practicante.
            </div>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {semanas.map((semana) => (
                <div
                  key={semana.numero_semana}
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 dark:text-white font-mono">
                        {semana.nombre_mes || `Mes ${semana.numero_mes || semana.numero_semana}`} ({semana.rango_str})
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                        Horas del mes: <b>{semana.horas_mes || semana.horas_semana} hrs</b>
                      </p>
                    </div>

                    {semana.firmado ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Firmado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 shrink-0">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Pendiente</span>
                      </span>
                    )}
                  </div>

                  {/* Acciones Minimalistas */}
                  <div className="pt-2.5 border-t border-gray-100 dark:border-zinc-900 flex items-center justify-between gap-2">
                    {semana.firmado ? (
                      <div className="flex items-center gap-1.5 w-full justify-between">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Firmado</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* El Ojito para previsualizar el PDF firmado */}
                          <button
                            onClick={() => handleDescargarPdfFirmado(semana.informe_firmado_id, semana.rango_str)}
                            className="p-1.5 text-[#3484A5] bg-[#3484A5]/10 hover:bg-[#3484A5]/20 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60 rounded-lg transition-colors cursor-pointer border border-[#3484A5]/30"
                            title="Ver / Previsualizar PDF firmado (Ojito)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Reemplazar archivo firmado */}
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
                      </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full justify-between">
                          {/* Botón Descargar PDF directo para firmar rápido */}
                          <button
                            onClick={() => handleDescargarPdfLimpio(semana)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#3484A5]/40 hover:bg-[#3484A5]/10 text-[#3484A5] dark:text-sky-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Previsualizar PDF en pantalla completa para revisar o guardar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver / Previsualizar PDF</span>
                          </button>


                          {/* Botón Principal: Subir Firmado */}
                          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3484A5] hover:bg-[#2b6f8b] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer">
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
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalViewerPdf
        isOpen={viewerPdfState.isOpen}
        onClose={() => setViewerPdfState((prev) => ({ ...prev, isOpen: false }))}
        pdfUrl={viewerPdfState.pdfUrl}
        title={viewerPdfState.title}
        filename={viewerPdfState.filename}
        onDownload={viewerPdfState.onDownload}
      />
    </Modal>
  );
}

