import React, { useState } from 'react';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import client from '../api/client';
import { KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function CambiarPasswordModal({ isOpen, onClose }) {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordNuevo !== passwordConfirm) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (passwordNuevo.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await client.post('/api/auth/cambiar-password', {
        password_actual: passwordActual,
        password_nuevo: passwordNuevo,
      });
      setSuccess('¡Contraseña actualizada y cifrada correctamente con Bcrypt!');
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirm('');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar Contraseña">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-3 rounded-none">
          <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Las contraseñas se almacenan con cifrado unidireccional Bcrypt con Salt contra accesos no autorizados al equipo.</span>
        </div>

        <AlertMessage message={error} type="error" onClose={() => setError(null)} />
        <AlertMessage message={success} type="success" onClose={() => setSuccess(null)} />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1">
            Contraseña Actual
          </label>
          <input
            type="password"
            required
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-none text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1">
            Nueva Contraseña
          </label>
          <input
            type="password"
            required
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-none text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1">
            Confirmar Nueva Contraseña
          </label>
          <input
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-none text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
            placeholder="••••••••"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-semibold uppercase rounded-none hover:bg-gray-200 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase rounded-none transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{loading ? 'Cifrando y Guardando...' : 'Actualizar Contraseña'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
