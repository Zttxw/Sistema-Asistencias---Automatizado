import axios from 'axios';

const getDynamicApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const envUrl = import.meta.env.VITE_API_URL;

    if (envUrl) {
      try {
        const parsed = new URL(envUrl);
        const port = (parsed.port === '8082') ? '8010' : (parsed.port || '8010');
        return `${protocol}//${hostname}:${port}`;
      } catch (e) {
        // Fallback
      }
    }
    return `${protocol}//${hostname}:8010`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8010';
};

const apiBaseUrl = getDynamicApiBaseUrl();

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones: Adjuntar Bearer Token si existe en localStorage
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas: Refresh de token automático sin bucle infinito
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Evitar interceptar peticiones de login o refresh fallidas
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/api/auth/login') &&
      !originalRequest.url.includes('/api/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Intentar renovar el access_token con el refresh_token
          const res = await axios.post(`${apiBaseUrl}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = res.data;

          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return client(originalRequest);
        } catch (refreshErr) {
          // Si el refresh falla (expiró o fue revocado), ir directo a logout local sin reintentar en bucle
          console.warn('El refresh token ha expirado o es inválido. Cerrando sesión local.');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('auth:logout'));
          return Promise.reject(refreshErr);
        }
      } else {
        // No hay refresh token disponible -> limpiar sesión
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.dispatchEvent(new Event('auth:logout'));
      }
    }

    return Promise.reject(error);
  }
);

export default client;
