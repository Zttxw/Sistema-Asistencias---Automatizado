import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function RequierePermiso({ codigo, children, fallback = null }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(codigo)) {
    return fallback;
  }

  return <>{children}</>;
}
