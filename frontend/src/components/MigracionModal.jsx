import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, FileText, AlertTriangle, CheckCircle2, XCircle, Calendar, Info } from 'lucide-react';
import Modal from './Modal';
import client from '../api/client';

export default function MigracionModal({ isOpen, onClose, onSuccess }) {
  // Fecha límite por defecto: Viernes 7 de agosto de 2026
  const fechaDefecto = '2026-08-07';

  const [fechaLimite, setFechaLimite] = useState(fechaDefecto);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState(null);
  const [resultReport, setResultReport] = useState(null);

  const handleDescargarPlantilla = async (formato = 'excel') => {
    setDownloadingTemplate(true);
    setError(null);
    try {
      const response = await client.get(`/api/asistencias/migracion/plantilla?formato=${formato}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = formato === 'csv' ? 'csv' : 'xlsx';
      link.setAttribute('download', `plantilla_migracion_asistencias.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Error al descargar la plantilla de migración.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const name = file.name.toLowerCase();
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
        setError('Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv) válido.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
      setResultReport(null);
    }
  };

  const handleImportar = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Debe seleccionar un archivo Excel o CSV para importar.');
      return;
    }
    if (!fechaLimite) {
      setError('Debe seleccionar una fecha límite máxima.');
      return;
    }

    setUploading(true);
    setError(null);
    setResultReport(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('fecha_limite', fechaLimite);

    try {
      const res = await client.post('/api/asistencias/migracion/importar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResultReport(res.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al procesar el archivo de migración.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResultReport(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Migración Masiva de Asistencias (Excel / CSV)">
      <div className="space-y-5">
        {/* Banner descriptivo */}
        <div className="p-3.5 bg-blue-50 dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 rounded-lg flex items-start gap-3 text-xs text-blue-800 dark:text-zinc-300">
          <Info className="w-5 h-5 text-blue-600 dark:text-zinc-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 dark:text-white">Reglas de Migración por Semanas y Feriados:</p>
            <p className="mt-0.5">
              1. Descargue la plantilla en Excel o CSV e ingrese el <strong>DNI del Practicante</strong>, fecha y horas.<br />
              2. La migración procesa asistencias <strong>únicamente de Lunes a Viernes</strong> (fines de semana y feriados calendario se omiten).<br />
              3. Opcionalmente defina una <strong>fecha límite</strong> (por defecto <strong>Viernes 7 de Agosto</strong>).
            </p>
          </div>
        </div>

        {/* Paso 1: Descargar Plantilla */}
        <div className="p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Plantilla Oficial de Migración</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">Columnas requeridas: DNI_Practicante, Fecha, Hora_Entrada, Hora_Salida.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDescargarPlantilla('excel')}
              disabled={downloadingTemplate}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Descargar plantilla en formato Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDescargarPlantilla('csv')}
              disabled={downloadingTemplate}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Descargar plantilla en formato CSV (.csv)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Formulario de Carga */}
        <form onSubmit={handleImportar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Fecha Límite Máxima *
              </label>
              <input
                type="date"
                required
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
                Se migrarán asistencias de <strong>Lunes a Viernes</strong> hasta esta fecha límite (Viernes 7 de agosto).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-primary" />
                Archivo Excel (.xlsx) o CSV (.csv) *
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                required
                onChange={handleFileChange}
                className="w-full text-xs text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 bg-white dark:bg-black cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary dark:file:bg-zinc-800 dark:file:text-white"
              />
              {selectedFile && (
                <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  ✓ Seleccionado: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Errores globales */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reporte de Resultados */}
          {resultReport && (
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Resumen de la Importación Masiva
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white dark:bg-black rounded-lg border border-gray-100 dark:border-zinc-800">
                  <span className="text-[10px] text-gray-400 block font-semibold">Procesadas</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">{resultReport.filas_procesadas}</span>
                </div>
                <div className="p-2 bg-white dark:bg-black rounded-lg border border-gray-100 dark:border-zinc-800">
                  <span className="text-[10px] text-gray-400 block font-semibold">Nuevas</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{resultReport.filas_creadas}</span>
                </div>
                <div className="p-2 bg-white dark:bg-black rounded-lg border border-gray-100 dark:border-zinc-800">
                  <span className="text-[10px] text-gray-400 block font-semibold">Actualizadas</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{resultReport.filas_actualizadas}</span>
                </div>
                <div className="p-2 bg-white dark:bg-black rounded-lg border border-gray-100 dark:border-zinc-800">
                  <span className="text-[10px] text-gray-400 block font-semibold">Omitidas / Errores</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{resultReport.total_errores}</span>
                </div>
              </div>

              {resultReport.errores && resultReport.errores.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-800 space-y-1">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Detalle de observaciones / errores:</p>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar text-[11px] font-mono space-y-1 bg-white dark:bg-black p-2 rounded-lg border border-gray-200 dark:border-zinc-800">
                    {resultReport.errores.map((errItem, idx) => (
                      <p key={idx} className="text-amber-600 dark:text-amber-400">
                        • Fila {errItem.fila}{errItem.dni ? ` (DNI: ${errItem.dni})` : ''}: {errItem.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-xs font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Procesando Archivo...' : 'Importar Asistencias'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

