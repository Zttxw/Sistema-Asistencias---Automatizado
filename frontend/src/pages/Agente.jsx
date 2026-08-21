import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Activity, Clock, Cpu, Wifi, CheckCircle2, XCircle, AlertTriangle, Terminal, Settings2, BarChart3, Save, Edit3 } from 'lucide-react';
import client from '../api/client';
import AlertMessage from '../components/AlertMessage';

export default function Agente() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState(null);
  const [config, setConfig] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logLines, setLogLines] = useState(200);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    api_url: '',
    network_range: 'auto',
    interval_seconds: 60,
    timeout_seconds: 3,
    interface: '',
  });

  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await client.get('/api/agente/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Error al obtener estado del agente:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await client.get('/api/agente/logs', { params: { lines: logLines } });
      setLogs(res.data);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Error al obtener logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logLines]);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await client.get('/api/agente/config');
      setConfig(res.data);
      setConfigForm({
        api_url: res.data.api_url || '',
        network_range: res.data.network_range || 'auto',
        interval_seconds: res.data.interval_seconds || 60,
        timeout_seconds: res.data.timeout_seconds || 3,
        interface: res.data.interface || '',
      });
    } catch (err) {
      console.error('Error al obtener configuración:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        api_url: configForm.api_url.trim(),
        network_range: configForm.network_range.trim() || 'auto',
        interval_seconds: parseInt(configForm.interval_seconds, 10) || 60,
        timeout_seconds: parseInt(configForm.timeout_seconds, 10) || 3,
        interface: configForm.interface.trim() ? configForm.interface.trim() : null,
      };

      const res = await client.put('/api/agente/config', payload);
      setConfig(res.data.config);
      setSuccessMsg('Configuración guardada correctamente.');
      setIsEditingConfig(false);

      setTimeout(() => {
        fetchStatus();
        fetchLogs();
        setTimeout(() => setSuccessMsg(null), 5000);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar la configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    fetchConfig();
  }, [fetchStatus, fetchLogs, fetchConfig]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchStatus();
        fetchLogs();
      }, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchStatus, fetchLogs]);

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const isRunning = status?.running === true;

  // Limpiar emojis para diseño formal y ultra-minimalista
  const cleanLabel = (text) => {
    if (!text) return '';
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/[\(\)]/g, '').trim();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase font-mono">
            Control del Agente Local
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Monitoreo en tiempo real del escáner ARP ejecutado en la red local.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Toggle Auto-Refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            <span>{autoRefresh ? 'Monitoreo Activo' : 'Monitoreo Pausado'}</span>
          </button>

          {/* Refrescar Manual */}
          <button
            onClick={() => { fetchStatus(); fetchLogs(); fetchConfig(); }}
            className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStatus || loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alertas y Mensajes */}
      <AlertMessage message={error} onClose={() => setError(null)} />
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Panel de Estado del Agente */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3484A5]" />
            Estado de Conexión del Agente
          </h2>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
            isRunning
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
              : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60'
          }`}>
            <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{isRunning ? 'EN LÍNEA' : 'SIN CONEXIÓN'}</span>
          </div>
        </div>

        {status?.error && !isRunning && (
          <div className="mx-5 mt-4 flex items-center gap-2.5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-xs font-medium text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{cleanLabel(status.error)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-200 dark:bg-zinc-800">
          {[
            { label: 'Última Señal', value: status?.seconds_since_last_pulse !== undefined && status.seconds_since_last_pulse !== null ? `Hace ${status.seconds_since_last_pulse}s` : '--', icon: Activity },
            { label: 'PID Proceso', value: status?.pid || '--', icon: Cpu },
            { label: 'Equipo Agente', value: status?.hostname || '--', icon: Settings2 },
            { label: 'Tiempo Activo', value: formatUptime(status?.uptime_seconds), icon: Clock },
            { label: 'Último Escaneo', value: status?.last_scan_time ? new Date(status.last_scan_time).toLocaleTimeString('es-PE') : '--', icon: Wifi },
            { label: 'Escaneos Totales', value: status?.total_scans ?? '--', icon: BarChart3 },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white dark:bg-zinc-950 p-3.5 flex flex-col items-center text-center gap-1">
                <Icon className={`w-4 h-4 ${idx === 0 && isRunning ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{item.label}</span>
                <span className={`text-xs font-bold font-mono ${idx === 0 && isRunning ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{item.value}</span>
              </div>
            );
          })}
        </div>

        {/* Resumen de Envíos */}
        {isRunning && (
          <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-zinc-800 border-t border-slate-200 dark:border-zinc-800 text-xs">
            <div className="bg-white dark:bg-zinc-950 p-2.5 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-500 dark:text-zinc-400">Envíos Exitosos:</span>
              <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">{status?.total_envios_exitosos ?? 0}</span>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-2.5 flex items-center justify-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-slate-500 dark:text-zinc-400">Envíos Fallidos:</span>
              <span className="font-bold font-mono text-red-600 dark:text-red-400">{status?.total_envios_fallidos ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Configuración de Parámetros del Agente */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#3484A5]" />
            Parámetros de Configuración
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingConfig(!isEditingConfig)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingConfig ? 'Cancelar Edición' : 'Editar Parámetros'}</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {loadingConfig && !config ? (
            <div className="text-center text-xs text-slate-400 dark:text-zinc-500">Cargando configuración...</div>
          ) : isEditingConfig ? (
            /* Formulario de Edición */
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    API Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    value={configForm.api_url}
                    onChange={(e) => setConfigForm({ ...configForm, api_url: e.target.value })}
                    placeholder="http://192.168.0.17:8010/api/deteccion"
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 font-mono bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Rango de Red Subred ARP
                  </label>
                  <input
                    type="text"
                    value={configForm.network_range}
                    onChange={(e) => setConfigForm({ ...configForm, network_range: e.target.value })}
                    placeholder="auto o 192.168.0.0/24"
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 font-mono bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Intervalo de Escaneo (segundos)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={configForm.interval_seconds}
                    onChange={(e) => setConfigForm({ ...configForm, interval_seconds: e.target.value })}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 font-mono bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Timeout ARP (segundos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={configForm.timeout_seconds}
                    onChange={(e) => setConfigForm({ ...configForm, timeout_seconds: e.target.value })}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 font-mono bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-[#3484A5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditingConfig(false)}
                  className="px-4 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#3484A5] hover:bg-[#2b6f8b] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingConfig ? 'Guardando...' : 'Guardar Parámetros'}</span>
                </button>
              </div>
            </form>
          ) : !config ? (
            <div className="text-center text-xs text-slate-400 dark:text-zinc-500">No se encontró la configuración del agente.</div>
          ) : (
            /* Vista Normal de Tarjetas */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {Object.entries(config).filter(([k]) => !k.startsWith('_')).map(([key, value]) => (
                <div key={key} className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/60 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-0.5">{key}</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white break-all">
                    {value === null ? 'auto' : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registro de Consola (Logs del Agente) */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#3484A5]" />
            Registro de Consola y Red
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase">Líneas:</label>
              <select
                value={logLines}
                onChange={(e) => setLogLines(Number(e.target.value))}
                className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md px-2 py-1 text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
            {logs && (
              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                {logs.returned_lines} / {logs.total_lines} líneas
              </span>
            )}
            <button
              onClick={fetchLogs}
              className="p-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Actualizar registros"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-slate-950 dark:bg-black">
          {loadingLogs && !logs ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-500">Cargando registros...</div>
          ) : !logs?.content ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-500">No se encontraron registros activos del agente.</div>
          ) : (
            <pre className="p-4 text-[11px] leading-relaxed font-mono text-emerald-400 whitespace-pre-wrap break-words selection:bg-emerald-900/50">
              {logs.content.split('\n').map((line, i) => {
                const textWithoutEmoji = cleanLabel(line);
                let lineClass = 'text-emerald-400/80';
                if (line.includes('[ERROR]')) lineClass = 'text-red-400';
                else if (line.includes('[WARNING]')) lineClass = 'text-amber-400';
                else if (line.includes('[INFO]') && (line.includes('ÉXITO') || line.includes('XITO'))) lineClass = 'text-emerald-400 font-semibold';
                else if (line.includes('====')) lineClass = 'text-sky-400/60';
                else if (line.includes('[CONTROL]')) lineClass = 'text-purple-400';

                return (
                  <span key={i} className={lineClass}>
                    {textWithoutEmoji}
                    {'\n'}
                  </span>
                );
              })}
              <span ref={logsEndRef} />
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
