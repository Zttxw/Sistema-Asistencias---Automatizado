import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function AlertMessage({ type = 'error', message, onClose }) {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`p-4 mb-4 rounded-md border flex items-center justify-between text-sm font-medium ${
        isError
          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
          : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      }`}
    >
      <div className="flex items-center space-x-2">
        {isError ? (
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
        )}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
