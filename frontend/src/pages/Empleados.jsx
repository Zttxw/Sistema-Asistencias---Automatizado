import React, { useState, useEffect } from 'react';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Pencil, UserX, RefreshCw, History, FileText } from 'lucide-react';

export default function Empleados() {
  const { hasPermission } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false);

  // Historial MAC State
  const [historialMac, setHistorialMac] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Reporte PDF State
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    mac: '',
    departamento: '',
    horas_meta: '',
    activo: true,
    motivo_cambio_mac: '',
  });
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchEmpleados = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.get('/api/empleados');
      setEmpleados(response.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la lista de empleados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  const openCreateModal = () => {
    setFormData({
      nombre: '',
      documento: '',
      mac: '',
      departamento: '',
      horas_meta: '',
      activo: true,
      motivo_cambio_mac: '',
    });
    setError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (emp) => {
    setSelectedEmpleado(emp);
    setFormData({
      nombre: emp.nombre,
      documento: emp.documento,
      mac: emp.mac,
      departamento: emp.departamento || '',
      horas_meta: emp.horas_meta !== null && emp.horas_meta !== undefined ? emp.horas_meta : '',
      activo: emp.activo,
      motivo_cambio_mac: '',
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (emp) => {
    setSelectedEmpleado(emp);
    setError(null);
    setIsDeleteModalOpen(true);
  };

  const openHistorialModal = async (emp) => {
    setSelectedEmpleado(emp);
    setLoadingHistorial(true);
    setError(null);
    setIsHistorialModalOpen(true);
    try {
      const res = await client.get(`/api/empleados/${emp.id}/historial_mac`);
      setHistorialMac(res.data);
    } catch (err) {
      console.error(err);
      setError('Error al obtener el historial de cambios de MAC.');
    } finally {
      setLoadingHistorial(false);
    }
  };

  const openReporteModal = (emp) => {
    setSelectedEmpleado(emp);
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    // Formatear fechas YYYY-MM-DD
    const fInicio = primerDiaMes.toISOString().split('T')[0];
    const fFin = hoy.toISOString().split('T')[0];

    setFechaInicio(fInicio);
    setFechaFin(fFin);
    setError(null);
    setIsReporteModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await client.post('/api/empleados', {
        nombre: formData.nombre,
        documento: formData.documento,
        mac: formData.mac,
        departamento: formData.departamento,
        horas_meta: formData.horas_meta !== '' ? parseInt(formData.horas_meta, 10) : null,
        activo: formData.activo,
      });
      setSuccess('Empleado registrado correctamente.');
      setIsCreateModalOpen(false);
      fetchEmpleados();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al registrar el empleado.');
    } finally {
      setSubmitting(false);
    }
  };

  const isMacChanged =
    selectedEmpleado &&
    formData.mac.trim().toUpperCase() !== (selectedEmpleado.mac || '').trim().toUpperCase();

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        nombre: formData.nombre,
        documento: formData.documento,
        mac: formData.mac,
        departamento: formData.departamento,
        horas_meta: formData.horas_meta !== '' && formData.horas_meta !== null ? parseInt(formData.horas_meta, 10) : null,
        activo: formData.activo,
      };
      if (isMacChanged && formData.motivo_cambio_mac) {
        payload.motivo_cambio_mac = formData.motivo_cambio_mac;
      }
      await client.put(`/api/empleados/${selectedEmpleado.id}`, payload);
      setSuccess('Datos del empleado actualizados correctamente.');
      setIsEditModalOpen(false);
      fetchEmpleados();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al actualizar el empleado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await client.delete(`/api/empleados/${selectedEmpleado.id}`);
      setSuccess('Empleado desactivado correctamente.');
      setIsDeleteModalOpen(false);
      fetchEmpleados();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al desactivar el empleado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerarPdf = async (e) => {
    e.preventDefault();
    if (!fechaInicio || !fechaFin) {
      setError('Debe seleccionar la fecha de inicio y la fecha de fin.');
      return;
    }
    setGeneratingPdf(true);
    setError(null);
    try {
      const response = await client.get(`/api/empleados/${selectedEmpleado.id}/informe_pdf`, {
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const nombreArchivo = `informe_${selectedEmpleado.nombre.replace(/\s+/g, '_')}_${fechaInicio}_${fechaFin}.pdf`;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Informe PDF descargado correctamente: ${nombreArchivo}`);
      setIsReporteModalOpen(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al generar el informe PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Catálogo de Empleados</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Administre el personal registrado, sus metas de horas y direcciones MAC.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchEmpleados}
            className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasPermission('empleados.crear') && (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors shadow-2xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Empleado</span>
            </button>
          )}
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError(null)} />
      {success && (
        <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Tabla */}
      <div className="bg-white dark:bg-black border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">Cargando empleados...</div>
        ) : empleados.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400 dark:text-zinc-500">No hay empleados registrados en el sistema.</div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Dirección MAC</th>
                <th className="px-6 py-4">Departamento</th>
                <th className="px-6 py-4">Meta Horas</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {empleados.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{emp.nombre}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs">{emp.documento}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-mono text-xs uppercase">{emp.mac}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">{emp.departamento || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 font-medium">
                    {emp.horas_meta !== null && emp.horas_meta !== undefined ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-zinc-800">
                        {emp.horas_meta} hrs
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {emp.activo ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border border-transparent dark:border-zinc-800">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    {hasPermission('asistencias.exportar') && (
                      <button
                        onClick={() => openReporteModal(emp)}
                        className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors cursor-pointer"
                        title="Generar Informe PDF de Prácticas"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openHistorialModal(emp)}
                      className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-secondary hover:bg-secondary/5 dark:hover:bg-secondary/10 rounded-md transition-colors cursor-pointer"
                      title="Ver historial de MAC"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    {hasPermission('empleados.editar') && (
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('empleados.eliminar') && emp.activo && (
                      <button
                        onClick={() => openDeleteModal(emp)}
                        className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
                        title="Desactivar"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nuevo Empleado */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nuevo Empleado">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Nombre Completo *</label>
            <input type="text" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white" placeholder="Ej. Jeanpier Merma" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">N° Documento *</label>
              <input type="text" required value={formData.documento} onChange={(e) => setFormData({ ...formData, documento: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono" placeholder="12345678" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Dirección MAC *</label>
              <input type="text" required value={formData.mac} onChange={(e) => setFormData({ ...formData, mac: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono uppercase" placeholder="68:58:A0:DB:7D:4D" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Departamento</label>
              <input type="text" value={formData.departamento} onChange={(e) => setFormData({ ...formData, departamento: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white" placeholder="Ej. TI / OTI" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Meta de Horas (Opcional)</label>
              <input type="number" min="1" value={formData.horas_meta} onChange={(e) => setFormData({ ...formData, horas_meta: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white" placeholder="Ej. 640" />
            </div>
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50">{submitting ? 'Guardando...' : 'Registrar Empleado'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Empleado */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Empleado">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Nombre Completo</label>
            <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">N° Documento</label>
              <input type="text" value={formData.documento} onChange={(e) => setFormData({ ...formData, documento: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Dirección MAC</label>
              <input type="text" value={formData.mac} onChange={(e) => setFormData({ ...formData, mac: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white font-mono uppercase" />
            </div>
          </div>
          {isMacChanged && (
            <div className="p-3 bg-amber-50/50 dark:bg-zinc-900 border border-amber-200/80 dark:border-zinc-800 rounded-lg space-y-1">
              <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300">Motivo del cambio de MAC (Opcional)</label>
              <textarea rows={2} value={formData.motivo_cambio_mac} onChange={(e) => setFormData({ ...formData, motivo_cambio_mac: e.target.value })} placeholder="Ej. Celular perdido, celular reemplazado por garantía, etc." className="w-full border border-amber-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Departamento</label>
              <input type="text" value={formData.departamento} onChange={(e) => setFormData({ ...formData, departamento: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Meta de Horas (Opcional)</label>
              <input type="number" min="1" value={formData.horas_meta} onChange={(e) => setFormData({ ...formData, horas_meta: e.target.value })} className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white" placeholder="Ej. 640" />
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <input type="checkbox" id="activo-check" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} className="rounded border-gray-300 dark:border-zinc-800 text-primary dark:text-white focus:ring-primary dark:focus:ring-white cursor-pointer" />
            <label htmlFor="activo-check" className="text-sm font-medium text-gray-700 dark:text-zinc-300 cursor-pointer">Empleado Activo</label>
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50">{submitting ? 'Guardando...' : 'Guardar Cambios'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Generar Informe PDF */}
      <Modal isOpen={isReporteModalOpen} onClose={() => setIsReporteModalOpen(false)} title={`Generar Informe PDF - ${selectedEmpleado?.nombre || ''}`}>
        <form onSubmit={handleGenerarPdf} className="space-y-4">
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            Seleccione el rango de fechas para generar el informe semanal de asistencias del practicante.
          </p>

          <div className="p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-lg flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-zinc-400 font-medium">Meta de horas configurada:</span>
            {selectedEmpleado?.horas_meta ? (
              <span className="font-bold text-primary dark:text-white bg-primary/10 dark:bg-zinc-800 px-2 py-0.5 rounded">
                Meta: {selectedEmpleado.horas_meta} horas
              </span>
            ) : (
              <span className="text-gray-400 dark:text-zinc-500 italic">No especificada</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Fecha Inicio *</label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Fecha Fin *</label>
              <input
                type="date"
                required
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsReporteModalOpen(false)}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={generatingPdf}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{generatingPdf ? 'Generando PDF...' : 'Generar PDF'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmación Desactivación */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Desactivación">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-zinc-300">
            ¿Está seguro de que desea desactivar a <strong>{selectedEmpleado?.nombre}</strong>?
            El empleado pasará a estar inactivo (soft-delete), conservando su historial de asistencias pasadas.
          </p>
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">Cancelar</button>
            <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50">{submitting ? 'Desactivando...' : 'Sí, Desactivar'}</button>
          </div>
        </div>
      </Modal>

      {/* Modal Historial de Cambios de MAC */}
      <Modal
        isOpen={isHistorialModalOpen}
        onClose={() => setIsHistorialModalOpen(false)}
        title={`Historial de MAC - ${selectedEmpleado?.nombre || ''}`}
      >
        <div className="space-y-4">
          {loadingHistorial ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-zinc-500">Cargando historial...</div>
          ) : historialMac.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-zinc-500">No hay registros de historial de MAC para este empleado.</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {historialMac.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono font-medium text-gray-800 dark:text-zinc-200">
                    {item.mac_anterior ? (
                      <span>
                        <span className="text-gray-500 dark:text-zinc-500 uppercase">{item.mac_anterior}</span>
                        <span className="mx-2 text-gray-400 dark:text-zinc-600 font-sans">→</span>
                        <span className="text-primary dark:text-white font-bold uppercase">{item.mac_nueva}</span>
                      </span>
                    ) : (
                      <span className="text-secondary font-bold">
                        Registro inicial ({item.mac_nueva.toUpperCase()})
                      </span>
                    )}
                    <span className="text-gray-400 dark:text-zinc-500 font-sans font-normal text-[11px]">
                      {new Date(item.fecha_cambio).toLocaleString()}
                    </span>
                  </div>
                  {item.motivo && (
                    <p className="text-gray-600 dark:text-zinc-400 italic font-sans mt-0.5">Motivo: {item.motivo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button type="button" onClick={() => setIsHistorialModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">Cerrar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
