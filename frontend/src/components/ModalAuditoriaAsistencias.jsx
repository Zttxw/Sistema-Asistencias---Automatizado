import React, { useState, useEffect } from 'react';
import client from '../api/client';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import { RefreshCw, Search } from 'lucide-react';

export default function ModalAuditoriaAsistencias({ isOpen, onClose }) {
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [accionFiltro, setAccionFiltro] = useState('TODAS');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchAuditorias = async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;

      const res = await client.get('/api/asistencias/auditoria', { params });
      setAuditorias(res.data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al cargar la auditoría.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditorias();
  }, [isOpen, fechaInicio, fechaFin]);

  // Filtrado en cliente
  const auditoriasFiltradas = auditorias.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      (item.empleado_nombre && item.empleado_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.usuario_email && item.usuario_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.motivo && item.motivo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAccion = accionFiltro === 'TODAS' || item.accion === accionFiltro;

    return matchesSearch && matchesAccion;
  });

  const totalPages = Math.ceil(auditoriasFiltradas.length / itemsPerPage) || 1;
  const paginatedData = auditoriasFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getAccionLabel = (accion) => {
    switch (accion) {
      case 'CREACION_MANUAL':
        return <span className="text-blue-600 dark:text-blue-400 font-medium">Creación Manual</span>;
      case 'EDICION':
        return <span className="text-amber-600 dark:text-amber-400 font-medium">Edición</span>;
      case 'ELIMINACION':
        return <span className="text-rose-600 dark:text-rose-400 font-medium">Eliminación</span>;
      case 'MIGRACION_EXCEL':
        return <span className="text-emerald-600 dark:text-emerald-400 font-medium">Migración Excel</span>;
      default:
        return <span className="text-gray-600 dark:text-zinc-400">{accion}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de Auditoría de Asistencias"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
        <AlertMessage message={error} onClose={() => setError(null)} />

        {/* Barra de Filtros Minimalista */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pb-1">
          <div className="flex flex-1 items-center space-x-3 w-full">
            {/* Buscador de Texto */}
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Buscar practicante, usuario o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Selector de Acción */}
            <select
              value={accionFiltro}
              onChange={(e) => setAccionFiltro(e.target.value)}
              className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas las acciones</option>
              <option value="EDICION">Edición de Horas</option>
              <option value="CREACION_MANUAL">Creación Manual</option>
              <option value="ELIMINACION">Eliminación</option>
              <option value="MIGRACION_EXCEL">Migración Excel</option>
            </select>
          </div>

          <button
            onClick={fetchAuditorias}
            disabled={loading}
            className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabla Limpia y Minimalista */}
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400 dark:text-zinc-500">Cargando registros...</div>
          ) : auditoriasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 dark:text-zinc-500">No se encontraron registros de auditoría.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/60 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Momento</th>
                    <th className="px-4 py-3">Usuario Responsable</th>
                    <th className="px-4 py-3">Practicante</th>
                    <th className="px-4 py-3">Fecha Afectada</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Detalle de Modificación</th>
                    <th className="px-4 py-3">Motivo / Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      {/* Momento */}
                      <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {item.created_at}
                      </td>

                      {/* Usuario Responsable */}
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">
                        {item.usuario_email}
                      </td>

                      {/* Practicante */}
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {item.empleado_nombre}
                      </td>

                      {/* Fecha Afectada */}
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-300 font-mono">
                        {item.fecha_asistencia}
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getAccionLabel(item.accion)}
                      </td>

                      {/* Detalle */}
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.accion === 'CREACION_MANUAL' ? (
                          <span className="text-gray-900 dark:text-white font-medium">{item.valores_nuevos}</span>
                        ) : item.accion === 'ELIMINACION' ? (
                          <span className="text-rose-500 line-through">{item.valores_anteriores}</span>
                        ) : (
                          <span className="text-gray-700 dark:text-zinc-300">
                            <span className="line-through text-gray-400 mr-1.5">{item.valores_anteriores}</span>
                            →
                            <span className="font-semibold text-gray-900 dark:text-white ml-1.5">{item.valores_nuevos}</span>
                          </span>
                        )}
                      </td>

                      {/* Motivo */}
                      <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 italic max-w-xs truncate" title={item.motivo || ''}>
                        {item.motivo || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación Minimalista */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 text-xs text-gray-400 dark:text-zinc-500">
              <div>
                Página {currentPage} de {totalPages} ({auditoriasFiltradas.length} registros)
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 rounded border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium cursor-pointer text-gray-700 dark:text-zinc-300"
                >
                  Anterior
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-2.5 py-1 rounded border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium cursor-pointer text-gray-700 dark:text-zinc-300"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
