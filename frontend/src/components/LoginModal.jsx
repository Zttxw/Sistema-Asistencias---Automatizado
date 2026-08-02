import React, { useState } from 'react';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      setEmail('');
      setPassword('');
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Error al iniciar sesión. Verifique sus credenciales.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Iniciar Sesión">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AlertMessage message={error} onClose={() => setError(null)} />

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Correo Electrónico *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              placeholder="ejemplo@sistema.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contraseña *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'Ingresando...' : 'Iniciar sesión'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
