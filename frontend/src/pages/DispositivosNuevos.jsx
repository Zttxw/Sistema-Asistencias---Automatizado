import React, { useState, useEffect } from 'react';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';
import { PlusCircle, RefreshCw, Radio } from 'lucide-react';

export default function DispositivosNuevos() {
  const [minutos, setMinutos] = useState(60);
  const [dispositivos, setDispositivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal para registrar empleado desde MAC
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedMac, setSelectedMac] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    departamento: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDispositivos = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const response = await client.get('/api/dispositivos/no_registrados', {
        params: { minutos },
      });
      setDispositivos(response.data);
    } catch (err) {
      console.error(err);
      if (!isSilent) {
        setError('Error al consultar dispositivos no registrados.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispositivos();

    // Auto-refresh cada 30 segundos (polling simple)
    const interval = setInterval(() => {
      fetchDispositivos(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [minutos]);

  const openRegisterModal = (mac) => {
    setSelectedMac(mac);
    setFormData({ nombre: '', documento: '', departamento: '' });
    setError(null);
    setIsRegisterModalOpen(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await client.post('/api/empleados', {
        nombre: formData.nombre,
        documento: formData.documento,
        mac: selectedMac,
        departamento: formData.departamento,
        activo: true,
      });
      setSuccess(`Empleado registrado asignando MAC ${selectedMac}.`);
      setIsRegisterModalOpen(false);
      fetchDispositivos();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al registrar el empleado.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '-';
    const date = new Date(dtStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dispositivos Nuevos</h2>
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" title="Escáner Activo"></span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Dispositivos Wi-Fi detectados en la red no asociados a un empleado.</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Selector de minutos */}
          <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">Vistos en los últimos:</span>
            <select
              value={minutos}
              onChange={(e) => setMinutos(Number(e.target.value))}
              className="bg-transparent border-none text-gray-800 focus:outline-none cursor-pointer font-medium"
            >
              <option value={10}>10 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>60 minutos</option>
            </select>
          </div>

          <button
            onClick={() => fetchDispositivos()}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError(null)} />
      {success && (
        <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Tabla de Dispositivos */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Escaneando red...</div>
        ) : dispositivos.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400 flex flex-col items-center justify-center space-y-2">
            <Radio className="w-8 h-8 text-gray-300 stroke-1" />
            <p>No hay dispositivos nuevos detectados recientemente.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Dirección MAC</th>
                <th className="px-6 py-4">Fabricante (OUI)</th>
                <th className="px-6 py-4">Primera Vez Visto</th>
                <th className="px-6 py-4">Última Vez Visto</th>
                <th className="px-6 py-4">Veces Visto</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dispositivos.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0"></span>
                    <span>{item.mac}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{item.fabricante || 'Desconocido'}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{formatDateTime(item.primera_vez_visto)}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{formatDateTime(item.ultima_vez_visto)}</td>
                  <td className="px-6 py-4 text-gray-700 font-mono text-xs font-semibold">{item.veces_visto}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openRegisterModal(item.mac)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Registrar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para Registrar Empleado con MAC prellenada */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Registrar Empleado desde Dispositivo"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dirección MAC (Detección en Vivo)</label>
            <input
              type="text"
              readOnly
              value={selectedMac}
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono cursor-not-allowed uppercase font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Completo del Empleado *</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Ej. Jeanpier Merma"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">N° Documento *</label>
            <input
              type="text"
              required
              value={formData.documento}
              onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
              placeholder="12345678"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Departamento</label>
            <input
              type="text"
              value={formData.departamento}
              onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Ej. TI"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Asignar a Empleado'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
