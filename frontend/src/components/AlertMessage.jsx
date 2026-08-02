import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function AlertMessage({ type = 'error', message, onClose }) {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`p-4 mb-4 rounded-md border flex items-center justify-between text-sm font-medium ${
        isError
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      }`}
    >
      <div className="flex items-center space-x-2">
        {isError ? (
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        )}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
