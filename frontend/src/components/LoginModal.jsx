import React, { useState } from 'react';
import Modal from './Modal';
import AlertMessage from './AlertMessage';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';

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
      const detail = err.response?.data?.detail;
      let msg = 'Error al iniciar sesión. Verifique sus credenciales.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((item) => item.msg || 'Datos de ingreso no válidos').join(', ');
      } else if (detail && typeof detail === 'object') {
        msg = detail.msg || JSON.stringify(detail);
      }
      setError(msg);
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
            Correo Electrónico *
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="email"
              required
              placeholder="ejemplo@sistema.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-sm bg-gray-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
            Contraseña *
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm bg-gray-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 focus:outline-none cursor-pointer rounded-lg hover:bg-gray-200/50 dark:hover:bg-zinc-800 transition-colors"
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex="-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-primary/90 dark:hover:bg-zinc-200 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 dark:border-black/40 border-t-white dark:border-t-black rounded-full animate-spin"></span>
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Iniciar sesión</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

