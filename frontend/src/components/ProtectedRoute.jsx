import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ codigo, children }) {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400 font-medium">
        Cargando verificación de permisos...
      </div>
    );
  }

  if (!hasPermission(codigo)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
