import React, { useState, useEffect } from 'react';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';
import RequierePermiso from '../components/RequierePermiso';
import Loader from '../components/Loader';
import { Download, CheckCircle, Calendar, User, RefreshCw } from 'lucide-react';

export default function Informes() {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getFirstDayOfMonthString = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(getFirstDayOfMonthString());
  const [fechaFin, setFechaFin] = useState(getTodayString());

  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchEmpleados = async () => {
    try {
      const res = await client.get('/api/empleados');
      const activos = res.data.filter((e) => e.activo);
      setEmpleados(activos);
      if (activos.length > 0) {
        setSelectedEmpleadoId(activos[0].id);
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err);
    }
  };

  const fetchInformes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/api/informes');
      setInformes(res.data);
    } catch (err) {
      console.error('Error al cargar historial de informes:', err);
      setError('No se pudo cargar el historial de informes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpleados();
    fetchInformes();
  }, []);

  const handleGenerarPDF = async (e) => {
    e.preventDefault();
    if (!selectedEmpleadoId) {
      setError('Debe seleccionar un practicante / empleado.');
      return;
    }
    if (fechaInicio > fechaFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    if (fechaFin > getTodayString()) {
      setError('La fecha de fin no puede ser posterior al día de hoy.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        empleado_id: parseInt(selectedEmpleadoId, 10),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      };

      const response = await client.post('/api/informes/generar', payload, {
        responseType: 'blob',
      });

      // Descargar archivo PDF generado
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const empSelect = empleados.find((e) => e.id === parseInt(selectedEmpleadoId, 10));
      const docName = empSelect ? empSelect.documento : selectedEmpleadoId;
      link.setAttribute('download', `informe_asistencias_${docName}_${fechaInicio}_${fechaFin}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg('Informe en PDF generado y descargado correctamente.');
      fetchInformes();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const jsonErr = JSON.parse(text);
          setError(jsonErr.detail || 'Error al generar el documento PDF.');
        } catch {
          setError('Error al generar el documento PDF.');
        }
      } else {
        setError(err.response?.data?.detail || 'Error al generar el documento PDF.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleAprobar = async (informeId) => {
    setApprovingId(informeId);
    setError(null);
    setSuccessMsg(null);
    try {
      await client.patch(`/api/informes/${informeId}/aprobar`);
      setSuccessMsg('El informe ha sido marcado como APROBADO correctamente.');
      fetchInformes();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al aprobar el informe.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Loader Overlay al generar PDF */}
      {generating && <Loader />}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Informes de Asistencia para Practicantes
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Genere documentos oficiales en PDF para constancia de prácticas y firma digital externa ONPE.
          </p>
        </div>

        <button
          onClick={fetchInformes}
          className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-zinc-300 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 text-sm font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <AlertMessage message={error} onClose={() => setError(null)} />
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 font-bold ml-4">
            &times;
          </button>
        </div>
      )}

      {/* Formulario de Generación */}
      <RequierePermiso codigo="informes.generar">
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 rounded-xl p-6 shadow-2xs">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Generar Nuevo Informe de Asistencias
          </h3>

          <form onSubmit={handleGenerarPDF} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Practicante / Empleado *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <select
                  value={selectedEmpleadoId}
                  onChange={(e) => setSelectedEmpleadoId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                >
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} ({emp.departamento || 'Sin Depto'}) - DNI: {emp.documento}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Fecha Inicio *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Fecha Fin *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  max={getTodayString()}
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={generating}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg hover:bg-gray-900 dark:hover:bg-zinc-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{generating ? 'Generando PDF...' : 'Generar PDF'}</span>
              </button>
            </div>
          </form>
        </div>
      </RequierePermiso>

      {/* Historial de Informes */}
      <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Historial de Informes Emitidos</h3>
          <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">{informes.length} informe(s) registrado(s)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">Cargando historial de informes...</div>
        ) : informes.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">
            No hay informes de asistencias registrados en el sistema.
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4">Practicante</th>
                <th className="px-6 py-4">Período Evaluado</th>
                <th className="px-6 py-4">Generado Por</th>
                <th className="px-6 py-4">Fecha Emisión</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {informes.map((item) => {
                const isAprobado = item.estado === 'aprobado';
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div>{item.empleado_nombre}</div>
                      <div className="text-xs text-gray-400 dark:text-zinc-500 font-normal">{item.empleado_departamento || 'OTI'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-zinc-300">
                      {item.fecha_inicio} al {item.fecha_fin}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-zinc-300">
                      {item.generado_por_email}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-zinc-400 font-mono">
                      {new Date(item.fecha_generacion).toLocaleString('es-PE')}
                    </td>
                    <td className="px-6 py-4">
                      {isAprobado ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-900/60">
                            <CheckCircle className="w-3 h-3" />
                            <span>Aprobado</span>
                          </span>
                          {item.aprobado_por_email && (
                            <div className="text-[10px] text-gray-400 dark:text-zinc-500">Por: {item.aprobado_por_email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-transparent dark:border-amber-900/60">
                          Generado (Pendiente Firma)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isAprobado && (
                        <RequierePermiso codigo="informes.aprobar">
                          <button
                            onClick={() => handleAprobar(item.id)}
                            disabled={approvingId === item.id}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-secondary text-white text-xs font-semibold rounded-lg hover:bg-secondary/90 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{approvingId === item.id ? 'Aprobando...' : 'Marcar como Aprobado'}</span>
                          </button>
                        </RequierePermiso>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
