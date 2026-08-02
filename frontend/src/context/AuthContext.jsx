import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import Loader from '../components/Loader';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = Visitante
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token'));
  const [loading, setLoading] = useState(true);

  // Cargar usuario / me al iniciar si hay token
  const fetchMe = async (currentToken) => {
    try {
      const response = await client.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setUser(response.data);
      return response.data;
    } catch (err) {
      console.error('Error al restaurar sesión:', err);
      logoutLocal();
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('access_token');
      if (savedToken) {
        await fetchMe(savedToken);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    const handleAuthLogoutEvent = () => {
      logoutLocal();
    };

    window.addEventListener('auth:logout', handleAuthLogoutEvent);
    initAuth();

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogoutEvent);
    };
  }, []);

  const login = async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    const { access_token, refresh_token } = res.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    setToken(access_token);
    setRefreshToken(refresh_token);

    const userData = await fetchMe(access_token);
    return userData;
  };

  const logoutLocal = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const logout = async () => {
    const currentRefToken = localStorage.getItem('refresh_token');
    if (currentRefToken) {
      try {
        await client.post('/api/auth/logout', { refresh_token: currentRefToken });
      } catch (err) {
        console.warn('Error al revocar refresh token en backend:', err);
      }
    }
    logoutLocal();
  };

  const hasPermission = (codigoPermiso) => {
    if (!user) return false; // Visitante no tiene permisos
    if (user.rol === 'Admin') return true; // Admin posee todos los permisos
    if (!user.permisos || !Array.isArray(user.permisos)) return false;
    return user.permisos.includes(codigoPermiso);
  };

  // Mostrar Loader durante la inicialización de sesión
  if (loading) {
    return <Loader />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        loading,
        login,
        logout,
        logoutLocal,
        hasPermission,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
