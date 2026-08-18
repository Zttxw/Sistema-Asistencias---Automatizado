import React, { useState, useEffect } from 'react';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Pencil, UserX, UserCheck, Shield, KeyRound, RefreshCw, Users, ShieldCheck, Check, Eye, EyeOff } from 'lucide-react';

export default function Usuarios() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'roles'

  // Data states
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Loading & Alerts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateRolModalOpen, setIsCreateRolModalOpen] = useState(false);

  // Form states
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rol_id: '',
    empleado_id: '',
  });

  const [editFormData, setEditFormData] = useState({
    id: null,
    email: '',
    password: '',
    rol_id: '',
    empleado_id: '',
    activo: true,
  });

  const [rolFormData, setRolFormData] = useState({
    nombre: '',
    descripcion: '',
    permisos: [],
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resUsers, resRoles, resPermisos, resEmp] = await Promise.all([
        client.get('/api/usuarios'),
        client.get('/api/roles'),
        client.get('/api/permisos'),
        client.get('/api/empleados').catch(() => ({ data: [] })),
      ]);
      setUsuarios(resUsers.data);
      setRoles(resRoles.data);
      setPermisos(resPermisos.data);
      setEmpleados(resEmp.data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la información de usuarios y roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Modal Open Handlers
  const openCreateModal = () => {
    setFormData({
      email: '',
      password: 'Muni2026',
      rol_id: roles.length > 0 ? roles[0].id : '',
      empleado_id: '',
    });
    setError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditFormData({
      id: user.id,
      email: user.email,
      password: '',
      rol_id: user.rol_id || (roles.length > 0 ? roles[0].id : ''),
      empleado_id: user.empleado_id || '',
      activo: user.activo,
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const openCreateRolModal = () => {
    setRolFormData({
      nombre: '',
      descripcion: '',
      permisos: [],
    });
    setError(null);
    setIsCreateRolModalOpen(true);
  };

  // Submit User Creation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        rol_id: parseInt(formData.rol_id, 10),
        empleado_id: formData.empleado_id ? parseInt(formData.empleado_id, 10) : null,
      };
      await client.post('/api/usuarios', payload);
      setSuccess('Usuario creado exitosamente.');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit User Edit
  const handleEditUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        email: editFormData.email,
        rol_id: parseInt(editFormData.rol_id, 10),
        empleado_id: editFormData.empleado_id ? parseInt(editFormData.empleado_id, 10) : null,
        activo: editFormData.activo,
      };
      if (editFormData.password && editFormData.password.trim() !== '') {
        payload.password = editFormData.password;
      }
      await client.put(`/api/usuarios/${editFormData.id}`, payload);
      setSuccess('Usuario actualizado correctamente.');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al actualizar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick reset password to Muni2026
  const handleResetPasswordDefault = async (user) => {
    if (!window.confirm(`¿Restablecer la contraseña de ${user.email} a "Muni2026"?`)) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await client.put(`/api/usuarios/${user.id}`, {
        email: user.email,
        rol_id: user.rol_id,
        empleado_id: user.empleado_id,
        activo: user.activo,
        password: 'Muni2026',
      });
      setSuccess(`La contraseña de ${user.email} se ha restablecido exitosamente a "Muni2026".`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al restablecer la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Create Role
  const handleCreateRol = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await client.post('/api/roles', rolFormData);
      setSuccess('Rol creado exitosamente.');
      setIsCreateRolModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al crear el rol.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Permiso in Role Form
  const togglePermiso = (codigo) => {
    setRolFormData((prev) => {
      const exists = prev.permisos.includes(codigo);
      return {
        ...prev,
        permisos: exists
          ? prev.permisos.filter((p) => p !== codigo)
          : [...prev.permisos, codigo],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Gestión de Usuarios y Roles
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Administra las cuentas de acceso al sistema, asignación de roles y permisos RBAC.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-600 dark:text-zinc-300 transition-colors"
            title="Recargar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasPermission('usuarios.gestionar') && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-primary dark:bg-white text-white dark:text-black font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          )}

          {hasPermission('roles.gestionar') && (
            <button
              onClick={openCreateRolModal}
              className="flex items-center gap-2 border border-gray-300 dark:border-zinc-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-500" />
              Nuevo Rol
            </button>
          )}
        </div>
      </div>

      <AlertMessage message={error} type="error" onClose={() => setError(null)} />
      <AlertMessage message={success} type="success" onClose={() => setSuccess(null)} />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'usuarios'
              ? 'border-primary text-primary dark:border-white dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Cuentas de Usuarios ({usuarios.length})
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-primary text-primary dark:border-white dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-500" />
          Catálogo de Roles ({roles.length})
        </button>
      </div>

      {/* TAB USUARIOS */}
      {activeTab === 'usuarios' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-2xs">
          {loading ? (
            <Loader text="Cargando usuarios..." />
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              No hay usuarios registrados en el sistema.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-zinc-400 font-semibold border-b border-gray-100 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">Usuario / Email</th>
                    <th className="py-3.5 px-4">Rol Asignado</th>
                    <th className="py-3.5 px-4">Practicante Vinculado</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {u.rol_nombre || 'Sin Rol'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-300">
                        {u.empleado_nombre ? (
                          <span className="font-medium text-gray-800 dark:text-zinc-200">
                            {u.empleado_nombre}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-zinc-500 italic">No vinculado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                            <UserCheck className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                            <UserX className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        {hasPermission('usuarios.gestionar') && (
                          <>
                            <button
                              onClick={() => handleResetPasswordDefault(u)}
                              className="p-1.5 text-gray-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors cursor-pointer"
                              title="Restablecer contraseña a Muni2026"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                              title="Editar Usuario / Cambiar Rol"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB ROLES */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{r.nombre}</h3>
                </div>
                <span className="text-xs text-gray-400 dark:text-zinc-500">ID: {r.id}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-400">{r.descripcion}</p>

              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-2">Permisos asignados:</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.permisos && r.permisos.length > 0 ? (
                    r.permisos.map((p, idx) => {
                      const codigo = typeof p === 'object' ? p.codigo : p;
                      return (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-md text-[11px] font-mono">
                          {codigo}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-400 italic">Ningún permiso asignado</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR USUARIO */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Crear Nuevo Usuario">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Correo Electrónico / Nombre de Usuario *
            </label>
            <input
              type="text"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ej: jefe@oficina.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Contraseña Inicial *
            </label>
            <div className="relative">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword(!showCreatePassword)}
                className="absolute right-3 top-2.5 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Rol Asignado *
            </label>
            <select
              required
              value={formData.rol_id}
              onChange={(e) => setFormData({ ...formData, rol_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Seleccionar Rol --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({r.descripcion})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Vincular a Practicante Físico (Opcional)
            </label>
            <select
              value={formData.empleado_id}
              onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Ninguno (Usuario de Sistema) --</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.documento})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-primary text-white dark:bg-white dark:text-black font-semibold rounded-lg hover:opacity-90"
            >
              {submitting ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR USUARIO */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Usuario">
        <form onSubmit={handleEditUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Correo Electrónico / Nombre de Usuario
            </label>
            <input
              type="text"
              required
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Nueva Contraseña (dejar en blanco para mantener la actual)
            </label>
            <div className="relative">
              <input
                type={showEditPassword ? 'text' : 'password'}
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="absolute right-3 top-2.5 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Rol Asignado *
            </label>
            <select
              required
              value={editFormData.rol_id}
              onChange={(e) => setEditFormData({ ...editFormData, rol_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({r.descripcion})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Practicante Vinculado
            </label>
            <select
              value={editFormData.empleado_id}
              onChange={(e) => setEditFormData({ ...editFormData, empleado_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Ninguno (Usuario de Sistema) --</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.documento})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="edit_activo"
              checked={editFormData.activo}
              onChange={(e) => setEditFormData({ ...editFormData, activo: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded-md focus:ring-primary"
            />
            <label htmlFor="edit_activo" className="text-xs font-medium text-gray-700 dark:text-zinc-300 cursor-pointer">
              Cuenta de Usuario Activa
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-primary text-white dark:bg-white dark:text-black font-semibold rounded-lg hover:opacity-90"
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CREAR ROL */}
      <Modal isOpen={isCreateRolModalOpen} onClose={() => setIsCreateRolModalOpen(false)} title="Crear Nuevo Rol">
        <form onSubmit={handleCreateRol} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Nombre del Rol *
            </label>
            <input
              type="text"
              required
              value={rolFormData.nombre}
              onChange={(e) => setRolFormData({ ...rolFormData, nombre: e.target.value })}
              placeholder="ej: Supervisor de Turno"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={rolFormData.descripcion}
              onChange={(e) => setRolFormData({ ...rolFormData, descripcion: e.target.value })}
              placeholder="Descripción de la función de este rol..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Seleccionar Permisos para este Rol:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 dark:border-zinc-800 rounded-lg">
              {permisos.map((p) => {
                const isSelected = rolFormData.permisos.includes(p.codigo);
                return (
                  <div
                    key={p.codigo}
                    onClick={() => togglePermiso(p.codigo)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-start gap-2 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 dark:bg-white/10 dark:border-white text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-primary dark:bg-white text-white dark:text-black border-transparent' : 'border-gray-300 dark:border-zinc-700'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <p className="font-mono font-semibold">{p.codigo}</p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400">{p.descripcion}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCreateRolModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-primary text-white dark:bg-white dark:text-black font-semibold rounded-lg hover:opacity-90"
            >
              {submitting ? 'Creando...' : 'Crear Rol'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
