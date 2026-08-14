import { useState, useCallback } from 'react';
import client from '../api/client';

export function useFirmaPeru() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const iniciarFirmaDigital = useCallback(async ({ empleadoId, semanaInicio, semanaFin, onSuccess, onError, onCancel }) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Solicitar token efímero y preparación de PDF al backend
      const res = await client.post('/api/firmaperu/preparar-firma', {
        empleado_id: empleadoId,
        semana_inicio: semanaInicio,
        semana_fin: semanaFin,
      });

      const { param_token, document_extension } = res.data;

      // 2. Determinar la URL base dinámica del servidor backend FastAPI (ej. http://10.0.50.30:8080)
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      // Usar puerto 8080 si estamos en desarrollo local o la URL del backend
      const backendPort = import.meta.env.VITE_API_PORT || '8080';
      const baseUrl = `${protocol}//${hostname}:${backendPort}`;

      // 3. Armar los parámetros iniciales requeridos por Firma Perú
      const paramsObj = {
        param_url: `${baseUrl}/api/firmaperu/param`,
        param_token: param_token,
        document_extension: document_extension || 'pdf',
      };

      const paramsJson = JSON.stringify(paramsObj);
      // UTF-8 safe base64 encoding
      const paramBase64 = btoa(unescape(encodeURIComponent(paramsJson)));

      // 4. Configurar callbacks globales en window para Firma Perú
      window.signatureInit = function () {
        console.log('[FirmaPeru] Firma iniciada en el cliente Java.');
      };

      window.signatureOk = function () {
        console.log('[FirmaPeru] Firma digital completada exitosamente.');
        setLoading(false);
        if (onSuccess) onSuccess();
      };

      window.signatureCancel = function () {
        console.log('[FirmaPeru] Firma digital cancelada por el usuario.');
        setLoading(false);
        if (onCancel) onCancel();
      };

      // 5. Iniciar ClickOnce / FirmaBridge
      if (typeof window.startSignature === 'function') {
        window.startSignature(48596, paramBase64);
      } else {
        const errMsj = 'El script de Firma Perú (startSignature) no está cargado en el navegador.';
        setError(errMsj);
        setLoading(false);
        if (onError) onError(errMsj);
      }
    } catch (err) {
      console.error('[FirmaPeru Error]', err);
      const detalleErr = err.response?.data?.detail || 'Error al preparar el documento para Firma Perú.';
      setError(detalleErr);
      setLoading(false);
      if (onError) onError(detalleErr);
    }
  }, []);

  return {
    iniciarFirmaDigital,
    loading,
    error,
    setError,
  };
}
