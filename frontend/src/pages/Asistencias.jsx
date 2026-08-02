import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';
import RequierePermiso from '../components/RequierePermiso';
import VisitanteHome from '../components/VisitanteHome';
import { useAuth } from '../context/AuthContext';
import { Download, Calendar, RefreshCw, PlusCircle, Edit3, ArrowLeft } from 'lucide-react';

export default function Asistencias() {
  const { user } = useAuth();
  const { onOpenLogin, setSidebarVisible } = useOutletContext();

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const getCurrentDatetimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Sub-vista para Visitante: 'menu' (tarjetas) o 'tabla' (asistencias de hoy)
  const [vistaVisitante, setVistaVisitante] = useState('menu');

  const [fecha, setFecha] = useState(getTodayString());
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal para Exportar
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInicio, setExportInicio] = useState('');
  const [exportFin, setExportFin] = useState('');
  const [exporting, setExporting] = useState(false);

  // Modal para Registro Manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [empleadosActivos, setEmpleadosActivos] = useState([]);
  const [manualForm, setManualForm] = useState({
    empleado_id: '',
    tipo: 'entrada',
    timestamp: getCurrentDatetimeLocal(),
    motivo: '',
  });
  const [manualError, setManualError] = useState(null);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Controlar visibilidad del sidebar según sub-vista del visitante
  useEffect(() => {
    if (!user) {
      setSidebarVisible(vistaVisitante !== 'menu');
    } else {
      setSidebarVisible(true);
    }
  }, [user, vistaVisitante, setSidebarVisible]);

  const fetchAsistencias = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (!user) {
        response = await client.get('/api/asistencias/hoy');
      } else {
        response = await client.get('/api/asistencias', {
          params: { fecha },
        });
      }
      setAsistencias(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'No se pudieron cargar las asistencias del servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user || vistaVisitante === 'tabla') {
      fetchAsistencias();
    }
  }, [fecha, user, vistaVisitante]);

  const openManualModal = async () => {
    setManualError(null);
    setManualForm({
      empleado_id: '',
      tipo: 'entrada',
      timestamp: getCurrentDatetimeLocal(),
      motivo: '',
    });
    try {
      const res = await client.get('/api/empleados');
      const activos = res.data.filter((e) => e.activo);
      setEmpleadosActivos(activos);
      if (activos.length > 0) {
        setManualForm((prev) => ({ ...prev, empleado_id: activos[0].id }));
      }
      setIsManualModalOpen(true);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de empleados.');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmittingManual(true);
    setManualError(null);
    try {
      const payload = {
        empleado_id: parseInt(manualForm.empleado_id, 10),
        tipo: manualForm.tipo,
        timestamp: manualForm.timestamp ? new Date(manualForm.timestamp).toISOString() : null,
        motivo: manualForm.motivo || null,
      };
      await client.post('/api/asistencia/manual', payload);
      setIsManualModalOpen(false);
      fetchAsistencias();
    } catch (err) {
      console.error(err);
      setManualError(err.response?.data?.detail || 'Error al registrar la asistencia manual.');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleExport = async (e) => {
    e.preventDefault();
    setExporting(true);
    setError(null);
    try {
      const params = {};
      if (exportInicio) params.fecha_inicio = exportInicio;
      if (exportFin) params.fecha_fin = exportFin;

      const response = await client.get('/api/asistencias/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asistencias.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Error al generar la exportación del archivo Excel.');
    } finally {
      setExporting(false);
    }
  };

  // --- Visitante en Menú de Tarjetas ---
  if (!user && vistaVisitante === 'menu') {
    return (
      <VisitanteHome
        onVerAsistencias={() => setVistaVisitante('tabla')}
        onOpenLogin={onOpenLogin}
      />
    );
  }

  // --- Vista normal: Tabla de Asistencias ---
  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-5">
        <div>
          {!user && vistaVisitante === 'tabla' && (
            <button
              onClick={() => setVistaVisitante('menu')}
              className="flex items-center space-x-1 text-xs font-medium text-black dark:text-white hover:opacity-80 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Menú Principal</span>
            </button>
          )}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {!user ? 'Asistencias de Hoy' : 'Registro de Asistencias'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            {!user
              ? 'Presencia del personal en tiempo real para el día de hoy.'
              : 'Consulte la presencia diaria del personal y exporte reportes.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm shadow-2xs">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent border-none text-gray-700 dark:text-zinc-200 focus:outline-none cursor-pointer font-medium"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm shadow-2xs font-medium text-gray-700 dark:text-zinc-200">
              <Calendar className="w-4 h-4 text-secondary" />
              <span>Día Actual (Hoy)</span>
            </div>
          )}

          <button
            onClick={fetchAsistencias}
            className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <RequierePermiso codigo="asistencias.registrar_manual">
            <button
              onClick={openManualModal}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white text-sm font-medium rounded-lg hover:bg-secondary/90 transition-colors shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar manual</span>
            </button>
          </RequierePermiso>

          <RequierePermiso codigo="asistencias.exportar">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-gray-900 dark:hover:bg-zinc-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar a Excel</span>
            </button>
          </RequierePermiso>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError(null)} />

      {/* Tabla de Asistencias */}
      <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">Cargando registros...</div>
        ) : asistencias.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">
            {!user
              ? 'No hay asistencias registradas para el día de hoy.'
              : `No hay asistencias registradas para la fecha seleccionada (${fecha}).`}
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Departamento</th>
                <th className="px-6 py-4">Hora Entrada</th>
                <th className="px-6 py-4">Hora Salida</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {asistencias.map((item, idx) => {
                const isPresente = !item.hora_salida;
                return (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.empleado}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">{item.departamento || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs">
                      <span>{item.hora_entrada || '-'}</span>
                      {item.origen_entrada === 'manual' && (
                        <Edit3
                          className="inline-block w-3.5 h-3.5 ml-1.5 text-accent align-middle cursor-help"
                          title={item.motivo ? `Entrada manual: ${item.motivo}` : 'Entrada manual'}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs">
                      <span>{item.hora_salida || '-'}</span>
                      {item.origen_salida === 'manual' && (
                        <Edit3
                          className="inline-block w-3.5 h-3.5 ml-1.5 text-accent align-middle cursor-help"
                          title={item.motivo ? `Salida manual: ${item.motivo}` : 'Salida manual'}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isPresente ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">
                          Presente
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border border-transparent dark:border-zinc-800">
                          Completo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Registrar Asistencia Manual */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Registrar Asistencia Manual"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <AlertMessage message={manualError} onClose={() => setManualError(null)} />

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Empleado *</label>
            <select
              required
              value={manualForm.empleado_id}
              onChange={(e) => setManualForm({ ...manualForm, empleado_id: e.target.value })}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
            >
              {empleadosActivos.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.departamento || 'Sin Depto'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Tipo de Registro *</label>
              <select
                value={manualForm.tipo}
                onChange={(e) => setManualForm({ ...manualForm, tipo: e.target.value })}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Fecha y Hora *</label>
              <input
                type="datetime-local"
                required
                value={manualForm.timestamp}
                onChange={(e) => setManualForm({ ...manualForm, timestamp: e.target.value })}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Motivo (Opcional)</label>
            <textarea
              rows={2}
              value={manualForm.motivo}
              onChange={(e) => setManualForm({ ...manualForm, motivo: e.target.value })}
              placeholder="Ej. Celular sin batería, olvidó marcar, etc."
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingManual}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-gray-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submittingManual ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Exportación */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Exportar Reporte a Excel"
      >
        <form onSubmit={handleExport} className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Seleccione el rango de fechas opcional. Si se dejan vacías, se exportarán las asistencias del mes actual.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={exportInicio}
                onChange={(e) => setExportInicio(e.target.value)}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={exportFin}
                onChange={(e) => setExportFin(e.target.value)}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={exporting}
              className="flex items-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-gray-900 dark:hover:bg-zinc-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Generando...' : 'Descargar Excel'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
