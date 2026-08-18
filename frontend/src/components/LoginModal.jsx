import React, { useState } from 'react';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setShowPassword(false);
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

  const handleClose = () => {
    setShowPassword(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Iniciar Sesión">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AlertMessage message={error} onClose={() => setError(null)} />

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
            Correo Electrónico *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              placeholder="ejemplo@sistema.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-primary dark:focus:border-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
            Contraseña *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-2.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg pl-9 pr-10 py-2 text-sm bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-primary dark:focus:border-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 focus:outline-none cursor-pointer"
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'Ingresando...' : 'Iniciar sesión'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

