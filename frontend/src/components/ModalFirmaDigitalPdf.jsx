import React, { useState, useEffect } from 'react';
import { Download, Upload, CheckCircle2, Clock, FileText, AlertCircle, RefreshCw, Layers, Sparkles, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import client from '../api/client';
import AlertMessage from './AlertMessage';
import { useFirmaPeru } from '../hooks/useFirmaPeru';

export default function ModalFirmaDigitalPdf({ isOpen, onClose, empleados = [] }) {
  const [empId, setEmpId] = useState('');
  const [semanas, setSemanas] = useState([]);
  const [consolidado, setConsolidado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subiendoId, setSubiendoId] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

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

      const res = await client.get(`/api/empleados/${empId}/informe_pdf`, {
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
      setError('No se pudo descargar el informe PDF preliminar.');
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
      await client.post(`/api/informes-firmados/empleados/${empId}/subir`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExito(`¡Informe del Mes ${semana.numero_mes || semana.numero_semana} (4 semanas) guardado exitosamente con la Firma Digital del Ingeniero!`);
      cargarSemanasCompletadas(empId);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al subir el informe PDF firmado.');
    } finally {
      setSubiendoId(null);
    }
  };

  const handleDescargarPdfFirmado = async (informeId, semanaStr) => {
    try {
      const res = await client.get(`/api/informes-firmados/${informeId}/descargar`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PDF_FIRMADO_${semanaStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError('No se pudo descargar el archivo PDF firmado.');
    }
  };

  const { iniciarFirmaDigital, loading: firmaLoading } = useFirmaPeru();

  const handleFirmarDigitalmente = (semana) => {
    if (!empId) return;
    setError(null);
    setExito(null);

    iniciarFirmaDigital({
      empleadoId: parseInt(empId, 10),
      semanaInicio: semana.semana_inicio,
      semanaFin: semana.semana_fin,
      onSuccess: () => {
        setExito(`¡Informe del Mes ${semana.numero_mes || semana.numero_semana} firmado digitalmente con Firma Perú de manera oficial!`);
        cargarSemanasCompletadas(empId);
      },
      onError: (errMsj) => {
        setError(errMsj || 'No se pudo completar la firma digital con Firma Perú.');
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Informes Mensuales (4 Semanas) & Firma Digital">
      <div className="space-y-5 text-gray-900 dark:text-zinc-100 font-sans">
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          Descargue el informe PDF del mes (4 semanas). Fírmelo digitalmente con Firma Perú o súbalo manualmente para que quede archivado oficialmente.
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
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 flex items-center gap-1"
                        style={{ 
                          backgroundColor: 'rgba(44, 167, 146, 0.12)', 
                          color: '#2CA792', 
                          borderColor: 'rgba(44, 167, 146, 0.3)' 
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        [FIRMADO]
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        [PENDIENTE]
                      </span>
                    )}
                  </div>

                  {/* Acciones por Semana */}
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-900 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => handleDescargarPdfLimpio(semana)}
                      className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-500" />
                      <span>Descargar PDF</span>
                    </button>

                    {semana.firmado ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDescargarPdfFirmado(semana.informe_firmado_id, semana.rango_str)}
                          className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver PDF</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleFirmarDigitalmente(semana)}
                          disabled={firmaLoading}
                          className="px-2.5 py-1 bg-sky-600 text-white text-xs font-bold rounded-md hover:bg-sky-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{firmaLoading ? 'Abriendo Firma Perú...' : 'Firma Perú'}</span>
                        </button>

                        <label className="px-2.5 py-1 bg-primary text-white dark:bg-white dark:text-black text-xs font-bold rounded-md hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{subiendoId === semana.numero_semana ? 'Guardando...' : 'Subir Manual'}</span>
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
    </Modal>
  );
}

