import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';
import ModalEditarAsistencia from '../components/ModalEditarAsistencia';
import RequierePermiso from '../components/RequierePermiso';
import VisitanteHome from '../components/VisitanteHome';
import DashboardGrafico from '../components/DashboardGrafico';
import VistaPresenciaDia from '../components/VistaPresenciaDia';
import VistaPracticante from '../components/VistaPracticante';
import MigracionModal from '../components/MigracionModal';
import ModalAuditoriaAsistencias from '../components/ModalAuditoriaAsistencias';
import { useAuth } from '../context/AuthContext';
import { Calendar, RefreshCw, PlusCircle, Edit3, FileSpreadsheet, Lock, Trash2, User, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';


export default function Asistencias() {
  const { user } = useAuth();
  const { onOpenLogin } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const vista = searchParams.get('tab') || 'dashboard';

  const setVista = (v) => {
    setSearchParams({ tab: v });
  };

  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentDatetimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [fecha, setFecha] = useState(getTodayString());
  const [modoFiltro, setModoFiltro] = useState('dia'); // 'dia' | 'practicante'
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');
  const [asistencias, setAsistencias] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal para Edición Manual
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [asistenciaAEditar, setAsistenciaAEditar] = useState(null);

  // Modal para Registro Manual y Migración Excel
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isMigracionModalOpen, setIsMigracionModalOpen] = useState(false);
  const [isAuditoriaModalOpen, setIsAuditoriaModalOpen] = useState(false);
  const [empleadosActivos, setEmpleadosActivos] = useState([]);

  const [modoCreacionManual, setModoCreacionManual] = useState('fecha_especifica'); // 'rapido' | 'fecha_especifica'
  const [manualForm, setManualForm] = useState({
    empleado_id: '',
    tipo: 'entrada',
    timestamp: getCurrentDatetimeLocal(),
    fecha: getTodayString(),
    hora_entrada: '08:00',
    hora_salida: '14:00',
    motivo: '',
  });
  const [manualError, setManualError] = useState(null);
  const [submittingManual, setSubmittingManual] = useState(false);

  const fetchAsistencias = async () => {
    setLoading(true);
    setError(null);
    try {
      const resEmp = await client.get('/api/empleados').catch(() => ({ data: [] }));
      setEmpleados(Array.isArray(resEmp.data) ? resEmp.data : []);

      if (selectedEmpleadoId && selectedEmpleadoId !== 'TODOS') {
        const resAsis = await client.get(`/api/asistencias/practicante/${selectedEmpleadoId}`);
        setAsistencias(Array.isArray(resAsis.data) ? resAsis.data : []);
      } else {
        const resAsis = await client.get('/api/asistencias', { params: { fecha } });
        setAsistencias(Array.isArray(resAsis.data) ? resAsis.data : []);
      }
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'No se pudieron cargar las asistencias del servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  const userPermisos = user?.permisos || [];
  const esAdminOJefe = user?.rol === 'Admin' || user?.rol === 'Jefe de Oficina' || userPermisos.includes('asistencias.ver');

  useEffect(() => {
    if (user && esAdminOJefe) {
      fetchAsistencias();
    }
  }, [fecha, selectedEmpleadoId, user, esAdminOJefe]);

  const totalPages = Math.ceil(asistencias.length / itemsPerPage) || 1;
  const paginatedAsistencias = asistencias.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEliminarAsistencia = async (item) => {
    if (item.esta_firmado) {
      setError('No se puede eliminar un registro correspondiente a un informe mensual firmado por la Jefatura.');
      return;
    }

    if (!window.confirm(`¿Está seguro de eliminar el registro de asistencia del ${item.fecha}?`)) {
      return;
    }

    try {
      await client.delete(`/api/asistencias/${item.id}`);
      fetchAsistencias();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'No se pudo eliminar la asistencia.');
    }
  };

  const openManualModal = async () => {
    setManualError(null);
    setModoCreacionManual('fecha_especifica');
    setManualForm({
      empleado_id: '',
      tipo: 'entrada',
      timestamp: getCurrentDatetimeLocal(),
      fecha: getTodayString(),
      hora_entrada: '08:00',
      hora_salida: '14:00',
      motivo: '',
    });
    try {
      const res = await client.get('/api/empleados');
      const lista = Array.isArray(res.data) ? res.data : [];
      const activos = lista.filter((e) => e && e.activo);
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
    setManualError(null);
    setSubmittingManual(true);
    try {
      let payload = {
        empleado_id: parseInt(manualForm.empleado_id, 10),
        motivo: manualForm.motivo || undefined,
      };

      if (modoCreacionManual === 'fecha_especifica') {
        payload.fecha = manualForm.fecha;
        payload.hora_entrada = manualForm.hora_entrada;
        payload.hora_salida = manualForm.hora_salida;
      } else {
        payload.tipo = manualForm.tipo;
        payload.timestamp = new Date(manualForm.timestamp).toISOString();
      }

      await client.post('/api/asistencia/manual', payload);
      setIsManualModalOpen(false);
      fetchAsistencias();
    } catch (err) {
      console.error(err);
      setManualError(
        err.response?.data?.detail || 'No se pudo realizar el registro manual.'
      );
    } finally {
      setSubmittingManual(false);
    }
  };

  // --- Vista Unificada para Visitante (Pública, Elegante y Minimalista) ---
  if (!user) {
    return <VisitanteHome onOpenLogin={onOpenLogin} />;
  }

  // Si el usuario es un Practicante / Empleado sin acceso global, mostrar su portal personal
  if (user && !esAdminOJefe) {
    return <VistaPracticante user={user} />;
  }

  // --- Vista de Gestión (Usuario Autenticado/Admin/Jefe) ---
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Encabezado y Acciones Principales */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Control de Asistencia
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Consulte la presencia diaria del personal, indicadores ejecutivos y exporte reportes.
          </p>
        </div>

        {/* Acciones Secundarias a la Derecha */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchAsistencias}
            className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(user?.rol === 'Admin' || user?.rol === 'Jefe de Oficina') && (
            <button
              onClick={() => setIsAuditoriaModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Ver trazabilidad de quién modificó asistencias"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Historial de Auditoría</span>
            </button>
          )}


          <RequierePermiso codigo="asistencias.registrar_manual">
            <button
              onClick={() => setIsMigracionModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Migrar Asistencias (Excel / CSV)</span>
            </button>
            <button
              onClick={openManualModal}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary text-white text-xs font-medium rounded-lg hover:bg-secondary/90 transition-colors shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar manual</span>
            </button>
          </RequierePermiso>
        </div>
      </div>


      <AlertMessage message={error} onClose={() => setError(null)} />

      {/* Renderizado dinámico de los Módulos */}
      {vista === 'dashboard' ? (
        <DashboardGrafico asistencias={asistencias} empleados={empleados} />
      ) : vista === 'dia' ? (
        <VistaPresenciaDia asistencias={asistencias} empleados={empleados} fecha={fecha} />
      ) : (
        /* Tabla de Asistencias con Selector de Practicante y Fecha */
        <div className="space-y-4">
          {/* Barra Superior de Filtros y Selección */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 p-4 rounded-xl shadow-2xs">
            {/* Selector de Practicante */}
            <div className="flex flex-1 items-center space-x-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3.5 py-2 text-xs">
              <User className="w-4 h-4 text-secondary shrink-0" />
              <span className="font-semibold text-gray-700 dark:text-zinc-300 whitespace-nowrap">Practicante:</span>
              <select
                value={selectedEmpleadoId}
                onChange={(e) => setSelectedEmpleadoId(e.target.value)}
                className="bg-transparent border-none text-gray-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer w-full"
              >
                <option value="TODOS" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white font-normal">
                  -- Ver Todos los Practicantes (Por Fecha) --
                </option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id.toString()} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white font-semibold">
                    {emp.nombre} ({emp.departamento || 'OTI'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Fecha (solo visible si se consulta 'TODOS' los practicantes) */}
            {(!selectedEmpleadoId || selectedEmpleadoId === 'TODOS') && (
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3.5 py-2 text-xs">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0" />
                <span className="text-gray-500 dark:text-zinc-400 font-medium whitespace-nowrap">Fecha de consulta:</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="bg-transparent border-none text-gray-900 dark:text-zinc-200 focus:outline-none cursor-pointer font-bold text-xs"
                />
              </div>
            )}
          </div>

          {/* Tabla de Registros */}
          <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">Cargando registros...</div>
            ) : asistencias.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">
                No hay asistencias registradas para la consulta seleccionada.
              </div>
            ) : (
              <>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Practicante</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Departamento</th>
                      <th className="px-6 py-4">Hora Entrada</th>
                      <th className="px-6 py-4">Hora Salida</th>
                      <th className="px-6 py-4">Horas Computadas</th>
                      <th className="px-6 py-4">Estado / Firma</th>
                      <RequierePermiso codigo="asistencias.registrar_manual">
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </RequierePermiso>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {paginatedAsistencias.map((item, idx) => {
                      const isPresente = !item.hora_salida;
                      return (
                        <tr key={item.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                            {item.empleado}
                          </td>
                          <td className="px-6 py-4 text-gray-700 dark:text-zinc-200 font-mono text-xs font-medium">
                            {item.fecha}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">{item.departamento || 'OTI'}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs">
                            <span>{item.hora_entrada || '-'}</span>
                            {item.origen_entrada === 'manual' && (
                              <Edit3
                                className="inline-block w-3.5 h-3.5 ml-1.5 text-amber-500 align-middle cursor-help"
                                title={item.motivo ? `Ajuste manual: ${item.motivo}` : 'Ajuste manual'}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs">
                            <span>{item.hora_salida || '-'}</span>
                            {item.origen_salida === 'manual' && (
                              <Edit3
                                className="inline-block w-3.5 h-3.5 ml-1.5 text-amber-500 align-middle cursor-help"
                                title={item.motivo ? `Ajuste manual: ${item.motivo}` : 'Ajuste manual'}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700 dark:text-zinc-200">
                            {item.horas_computables !== undefined ? `${item.horas_computables.toFixed(1)} hrs` : '-'}
                          </td>
                          <td className="px-6 py-4">
                            {item.esta_firmado ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                                <Lock className="w-3 h-3" />
                                <span>Informe Firmado</span>
                              </span>
                            ) : isPresente ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                                Presente
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border border-transparent dark:border-zinc-800">
                                Completo
                              </span>
                            )}
                          </td>

                          <RequierePermiso codigo="asistencias.registrar_manual">
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setAsistenciaAEditar(item);
                                    setIsEditModalOpen(true);
                                  }}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    item.esta_firmado
                                      ? 'text-gray-400 bg-gray-50 border-gray-200 dark:border-zinc-800 dark:bg-zinc-900 cursor-not-allowed'
                                      : 'text-secondary hover:bg-secondary/10 border-gray-200 dark:border-zinc-800'
                                  }`}
                                  title={item.esta_firmado ? 'Bloqueado por informe firmado' : 'Modificar registro de asistencia'}
                                >
                                  {item.esta_firmado ? <Lock className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                </button>
                                {!item.esta_firmado && (
                                  <button
                                    onClick={() => handleEliminarAsistencia(item)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-gray-200 dark:border-zinc-800 transition-colors cursor-pointer"
                                    title="Eliminar registro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </RequierePermiso>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Control de Paginación */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 text-xs text-gray-500 dark:text-zinc-400">
                  <div>
                    Mostrando <span className="font-semibold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, asistencias.length)}</span> de <span className="font-semibold text-gray-900 dark:text-white">{asistencias.length}</span> registros (20 por página)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium cursor-pointer"
                    >
                      Anterior
                    </button>
                    <span className="px-2 font-semibold text-gray-700 dark:text-zinc-300">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar Asistencia */}
      <ModalEditarAsistencia
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        asistencia={asistenciaAEditar}
        onSuccess={() => fetchAsistencias()}
      />

      {/* Modal Registrar Asistencia Manual */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Registrar Asistencia Manual"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <AlertMessage message={manualError} onClose={() => setManualError(null)} />

          {/* Selector de Modo de Creación */}
          <div className="flex items-center bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setModoCreacionManual('fecha_especifica')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                modoCreacionManual === 'fecha_especifica'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Por Fecha Específica / Justificación
            </button>
            <button
              type="button"
              onClick={() => setModoCreacionManual('rapido')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                modoCreacionManual === 'rapido'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Marcación Rápida (Hoy / Ahora)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Practicante *</label>
            <select
              required
              value={manualForm.empleado_id}
              onChange={(e) => setManualForm({ ...manualForm, empleado_id: e.target.value })}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-medium"
            >
              {empleadosActivos.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.departamento || 'OTI'})
                </option>
              ))}
            </select>
          </div>

          {modoCreacionManual === 'fecha_especifica' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Fecha de la Asistencia *</label>
                <input
                  type="date"
                  required
                  value={manualForm.fecha}
                  onChange={(e) => setManualForm({ ...manualForm, fecha: e.target.value })}
                  className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Hora Entrada *</label>
                  <input
                    type="time"
                    required
                    value={manualForm.hora_entrada}
                    onChange={(e) => setManualForm({ ...manualForm, hora_entrada: e.target.value })}
                    className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Hora Salida (Opcional)</label>
                  <input
                    type="time"
                    value={manualForm.hora_salida}
                    onChange={(e) => setManualForm({ ...manualForm, hora_salida: e.target.value })}
                    className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Tipo de Registro *</label>
                <select
                  value={manualForm.tipo}
                  onChange={(e) => setManualForm({ ...manualForm, tipo: e.target.value })}
                  className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
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
                  className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Motivo / Justificación</label>
            <textarea
              rows={2}
              value={manualForm.motivo}
              onChange={(e) => setManualForm({ ...manualForm, motivo: e.target.value })}
              placeholder="Ej. Ausencia con papeleta de permiso, comisión de servicio, olvidó marcar, etc."
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-primary dark:focus:border-white"
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
              className="px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submittingManual ? 'Registrando...' : 'Registrar Asistencia'}
            </button>
          </div>
        </form>
      </Modal>
      {/* Modal Migración Excel */}
      <MigracionModal
        isOpen={isMigracionModalOpen}
        onClose={() => setIsMigracionModalOpen(false)}
        onSuccess={() => fetchAsistencias()}
      />
      {/* Modal Auditoría para Administrador */}
      <ModalAuditoriaAsistencias
        isOpen={isAuditoriaModalOpen}
        onClose={() => setIsAuditoriaModalOpen(false)}
      />
    </div>
  );
}

