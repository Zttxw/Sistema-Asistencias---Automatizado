import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Power, Activity, Clock, Cpu, Wifi, CheckCircle2, XCircle, AlertTriangle, Terminal, Settings2, BarChart3, Save, Edit3 } from 'lucide-react';
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
  const [restarting, setRestarting] = useState(false);
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

  const handleRestart = async () => {
    if (!window.confirm('¿Estás seguro de reiniciar el Agente de Asistencia? El escaneo se detendrá momentáneamente.')) return;
    setRestarting(true);
    setError(null);
    try {
      await client.post('/api/agente/restart');
      setSuccessMsg('Señal de reinicio enviada. El agente se reiniciará en unos segundos.');
      setTimeout(() => {
        fetchStatus();
        fetchLogs();
        setRestarting(false);
        setTimeout(() => setSuccessMsg(null), 5000);
      }, 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al reiniciar el agente.');
      setRestarting(false);
    }
  };

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
      setSuccessMsg('¡Configuración guardada correctamente! El agente se está reiniciando con los nuevos parámetros.');
      setIsEditingConfig(false);

      setTimeout(() => {
        fetchStatus();
        fetchLogs();
        setTimeout(() => setSuccessMsg(null), 5000);
      }, 4000);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary dark:text-white" />
            Control del Agente
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Monitoree el estado, configure parámetros y gestione el Agente de Asistencia (Escáner ARP).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Auto-Refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-800'
            }`}
          >
            <Activity className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
          </button>

          {/* Refrescar Manual */}
          <button
            onClick={() => { fetchStatus(); fetchLogs(); fetchConfig(); }}
            className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Actualizar todo"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStatus || loadingLogs ? 'animate-spin' : ''}`} />
          </button>

          {/* Botón Reiniciar */}
          <button
            onClick={handleRestart}
            disabled={restarting}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Power className="w-4 h-4" />
            <span>{restarting ? 'Reiniciando...' : 'Reiniciar Agente'}</span>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <AlertMessage message={error} onClose={() => setError(null)} />
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Panel de Estado */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary dark:text-white" />
            Estado del Agente
          </h2>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isRunning
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
          }`}>
            {isRunning ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>En Línea</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                <span>Detenido</span>
              </>
            )}
          </div>
        </div>

        {status?.error && !isRunning && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{status.error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-100 dark:bg-zinc-800">
          {[
            { label: 'PID', value: status?.pid || '--', icon: Cpu },
            { label: 'Hostname', value: status?.hostname || '--', icon: Settings2 },
            { label: 'Uptime', value: formatUptime(status?.uptime_seconds), icon: Clock },
            { label: 'Último Escaneo', value: status?.last_scan_time ? new Date(status.last_scan_time).toLocaleTimeString('es-PE') : '--', icon: Wifi },
            { label: 'Dispositivos', value: status?.devices_last_scan ?? '--', icon: Wifi },
            { label: 'Escaneos Total', value: status?.total_scans ?? '--', icon: BarChart3 },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white dark:bg-zinc-950 p-4 flex flex-col items-center text-center gap-1">
                <Icon className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{item.label}</span>
                <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">{item.value}</span>
              </div>
            );
          })}
        </div>

        {/* Envíos */}
        {isRunning && (
          <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-zinc-800 border-t border-gray-100 dark:border-zinc-800">
            <div className="bg-white dark:bg-zinc-950 p-3 flex items-center justify-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-gray-500 dark:text-zinc-400">Envíos Exitosos:</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{status?.total_envios_exitosos ?? 0}</span>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-3 flex items-center justify-center gap-3">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500 dark:text-zinc-400">Envíos Fallidos:</span>
              <span className="text-sm font-bold font-mono text-red-600 dark:text-red-400">{status?.total_envios_fallidos ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* FORMULARIO E INTERFAZ DE CONFIGURACIÓN DEL AGENTE */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary dark:text-white" />
            Configuración del Agente
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingConfig(!isEditingConfig)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingConfig ? 'Cancelar Edición' : 'Editar Configuración'}</span>
            </button>
            <button
              onClick={fetchConfig}
              className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Recargar configuración"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {loadingConfig && !config ? (
            <div className="text-center text-sm text-gray-400 dark:text-zinc-500">Cargando configuración...</div>
          ) : isEditingConfig ? (
            /* Formulario de Edición */
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    API Endpoint URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={configForm.api_url}
                    onChange={(e) => setConfigForm({ ...configForm, api_url: e.target.value })}
                    placeholder="http://192.168.0.17:8010/api/deteccion"
                    className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                    URL completa del backend que recibe las detecciones.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Rango de Red (Subred ARP)
                  </label>
                  <input
                    type="text"
                    value={configForm.network_range}
                    onChange={(e) => setConfigForm({ ...configForm, network_range: e.target.value })}
                    placeholder="auto o 192.168.0.0/24"
                    className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                    Usar <code className="text-emerald-500 font-bold">auto</code> para autodetectar Ethernet / Wi-Fi automáticamente.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Intervalo de Escaneo (segundos)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={configForm.interval_seconds}
                    onChange={(e) => setConfigForm({ ...configForm, interval_seconds: e.target.value })}
                    className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                    Tiempo de espera entre cada ciclo de escaneo (Predeterminado: 60s).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Timeout ARP (segundos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={configForm.timeout_seconds}
                    onChange={(e) => setConfigForm({ ...configForm, timeout_seconds: e.target.value })}
                    className="w-full border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                    Tiempo de espera por respuesta ARP (Predeterminado: 3s).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditingConfig(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white dark:bg-white dark:text-black text-sm font-medium rounded-lg hover:bg-primary/90 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingConfig ? 'Guardando...' : 'Guardar y Aplicar Configuración'}</span>
                </button>
              </div>
            </form>
          ) : !config ? (
            <div className="text-center text-sm text-gray-400 dark:text-zinc-500">No se encontró la configuración del agente.</div>
          ) : (
            /* Vista Normal de Tarjetas */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(config).filter(([k]) => !k.startsWith('_')).map(([key, value]) => (
                <div key={key} className="bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/60 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{key}</span>
                  <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white break-all">
                    {value === null ? 'null (auto)' : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visor de Logs */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary dark:text-white" />
            Logs del Agente
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">Líneas:</label>
              <select
                value={logLines}
                onChange={(e) => setLogLines(Number(e.target.value))}
                className="text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md px-2 py-1 text-gray-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
            {logs && (
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                {logs.returned_lines} / {logs.total_lines} líneas
              </span>
            )}
            <button
              onClick={fetchLogs}
              className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Actualizar logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto custom-scrollbar bg-gray-950 dark:bg-black">
          {loadingLogs && !logs ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-zinc-500">Cargando logs...</div>
          ) : !logs?.content ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-zinc-500">No se encontraron logs del agente.</div>
          ) : (
            <pre className="p-4 text-[11px] leading-relaxed font-mono text-green-400 whitespace-pre-wrap break-words selection:bg-green-900/50">
              {logs.content.split('\n').map((line, i) => {
                let lineClass = 'text-green-400/80';
                if (line.includes('[ERROR]')) lineClass = 'text-red-400';
                else if (line.includes('[WARNING]')) lineClass = 'text-amber-400';
                else if (line.includes('[INFO]') && (line.includes('ÉXITO') || line.includes('XITO'))) lineClass = 'text-emerald-400 font-semibold';
                else if (line.includes('====')) lineClass = 'text-cyan-400/60';
                else if (line.includes('[CONTROL]')) lineClass = 'text-purple-400';

                return (
                  <span key={i} className={lineClass}>
                    {line}
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
