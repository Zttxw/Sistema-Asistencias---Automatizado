#!/usr/bin/env python3
"""
EYES Agent v1.1 - Agente de Asistencia (Multiplataforma: Windows / Linux)
Escanea dispositivos en la red local mediante ARP activo (Scapy)
y envía las direcciones MAC detectadas a una API REST (/api/deteccion).

Ejecución:
  - Proceso de fondo sin ventana nativa (eliminado pywebview/WebView2).
  - Ícono en la bandeja del sistema (System Tray vía pystray) con menú contextual.
  - Servidor HTTP de control local (127.0.0.1:5050) que expone la API REST
    y sirve el Dashboard Web v1.1 en el navegador por defecto.
  - Mutex de instancia única (Global\\EYES_SingleInstance_Mutex_8F123A45).
"""

import json
import logging
from logging.handlers import RotatingFileHandler
import os
import platform
import socket
import subprocess
import sys
import time
import threading
import webbrowser
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import ipaddress

try:
    import requests
except ImportError:
    print("[ERROR] La biblioteca 'requests' no está instalada. Ejecute: pip install requests")
    sys.exit(1)

try:
    from scapy.all import ARP, Ether, srp, conf, get_if_addr
    try:
        conf.use_pcap = True
    except Exception:
        pass
except ImportError:
    print("[ERROR] La biblioteca 'scapy' no está instalada. Ejecute: pip install scapy")
    sys.exit(1)

# Soporte opcional para System Tray (pystray + Pillow)
TRAY_AVAILABLE = False
try:
    import pystray
    from PIL import Image, ImageDraw
    TRAY_AVAILABLE = True
except ImportError:
    print("[INFO] 'pystray' o 'Pillow' no instalados. El agente correrá sin ícono en tray.")

IS_WINDOWS = platform.system() == "Windows"


# =====================================================
# Instancia Única (Mutex en Windows / Socket Lock)
# =====================================================
def asegurar_instancia_unica():
    """
    Garantiza que solo una instancia del agente corra simultáneamente.
    Si ya existe una instancia activa, abre el panel web en el navegador y termina.
    """
    if IS_WINDOWS:
        try:
            import ctypes
            mutex_name = "Global\\EYES_SingleInstance_Mutex_8F123A45"
            kernel32 = ctypes.windll.kernel32
            mutex = kernel32.CreateMutexW(None, False, mutex_name)
            last_error = kernel32.GetLastError()
            ERROR_ALREADY_EXISTS = 183
            if last_error == ERROR_ALREADY_EXISTS:
                print("[INFO] Instancia previa detectada. Abriendo panel web en navegador...")
                try:
                    webbrowser.open("http://127.0.0.1:5050")
                except Exception as e:
                    print(f"[ERROR] No se pudo abrir navegador: {e}")
                sys.exit(0)
            return mutex
        except Exception as e:
            print(f"[WARN] Error al verificar mutex de Windows: {e}")
    else:
        try:
            lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            lock_socket.bind(("127.0.0.1", 5051))
            return lock_socket
        except socket.error:
            print("[INFO] Instancia previa detectada. Abriendo panel web...")
            try:
                webbrowser.open("http://127.0.0.1:5050")
            except Exception:
                pass
            sys.exit(0)


# =====================================================
# Directorios de Datos y Logging
# =====================================================
def obtener_data_dir():
    """
    Determina la carpeta de datos (donde viven config.json y agente.log).
    Orden de prioridad:
      1. Variable de entorno AGENTE_DATA_DIR
      2. Carpeta del ejecutable (.exe compilado)
      3. Carpeta del script (.py)
    """
    env_dir = os.environ.get("AGENTE_DATA_DIR")
    if env_dir and os.path.isdir(env_dir):
        return env_dir

    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)

    return os.path.dirname(os.path.abspath(__file__))


def setup_logging():
    """Configuración del sistema de logging (Consola + Archivo agente.log)"""
    log_format = "%(asctime)s [%(levelname)s] %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    if logger.hasHandlers():
        logger.handlers.clear()

    data_dir = obtener_data_dir()
    log_path = os.path.join(data_dir, "agente.log")

    try:
        file_handler = RotatingFileHandler(log_path, maxBytes=5*1024*1024, backupCount=3, encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(log_format, date_format))
        logger.addHandler(file_handler)
    except PermissionError:
        if IS_WINDOWS:
            fallback_dir = os.path.join(
                os.environ.get("ProgramData", r"C:\ProgramData"),
                "SistemaAsistencias", "Agente"
            )
            os.makedirs(fallback_dir, exist_ok=True)
            log_path = os.path.join(fallback_dir, "agente.log")
            file_handler = RotatingFileHandler(log_path, maxBytes=5*1024*1024, backupCount=3, encoding="utf-8")
            file_handler.setFormatter(logging.Formatter(log_format, date_format))
            logger.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(log_format, date_format))
    logger.addHandler(console_handler)


def cargar_configuracion():
    """Carga config.json desde la carpeta de datos o fallbacks."""
    config_default = {
        "network_range": "auto",
        "api_url": "http://localhost:8010/api/deteccion",
        "interval_seconds": 60,
        "timeout_seconds": 3,
        "interface": None,
        "control_port": 5050,
        "secret_token": None
    }

    rutas_candidatas = []
    data_dir = obtener_data_dir()
    rutas_candidatas.append(os.path.join(data_dir, "config.json"))

    if IS_WINDOWS:
        programdata_dir = os.path.join(
            os.environ.get("ProgramData", r"C:\ProgramData"),
            "SistemaAsistencias", "Agente"
        )
        ruta_pd = os.path.join(programdata_dir, "config.json")
        if ruta_pd not in rutas_candidatas:
            rutas_candidatas.append(ruta_pd)

    for ruta_config in rutas_candidatas:
        if os.path.exists(ruta_config):
            try:
                with open(ruta_config, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    for k, v in config_default.items():
                        if k not in config:
                            config[k] = v
                    return config
            except Exception as e:
                logging.error(f"Error al leer {ruta_config}: {e}")
                continue

    return config_default


def guardar_configuracion(nuevos_datos):
    """Guarda los cambios en config.json."""
    data_dir = obtener_data_dir()
    config_path = os.path.join(data_dir, "config.json")
    config_actual = cargar_configuracion()

    for k in ["network_range", "interface", "api_url", "interval_seconds", "timeout_seconds", "control_port", "secret_token"]:
        if k in nuevos_datos:
            config_actual[k] = nuevos_datos[k]

    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_actual, f, indent=2, ensure_ascii=False)

    return config_actual


# =====================================================
# Detección de Red y Escaneo ARP
# =====================================================
def obtener_ip_local():
    """Detecta la dirección IP de la interfaz activa."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def detectar_rango_red_auto(interface=None):
    """Autodetecta el rango de red /24."""
    ip_local = None
    if interface:
        try:
            ip_iface = get_if_addr(interface)
            if ip_iface and ip_iface != "0.0.0.0":
                ip_local = ip_iface
        except Exception as e:
            logging.warning(f"No se pudo obtener la IP para la interfaz {interface}: {e}")

    if not ip_local:
        ip_local = obtener_ip_local()
        if ip_local == "127.0.0.1":
            try:
                ip_scapy = get_if_addr(conf.iface)
                if ip_scapy and ip_scapy != "0.0.0.0":
                    ip_local = ip_scapy
            except Exception:
                pass

    if not ip_local or ip_local == "127.0.0.1":
        return "192.168.1.0/24"

    network = ipaddress.IPv4Interface(f"{ip_local}/24").network
    return str(network)


def realizar_escaneo_arp(rango_red, timeout_seconds=3, interface=None):
    """Realiza escaneo ARP con Scapy."""
    paquete = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=rango_red)
    kwargs = {"timeout": timeout_seconds, "retry": 2, "verbose": False}
    if interface:
        kwargs["iface"] = interface

    dispositivos_detectados = []
    try:
        respuestas, _ = srp(paquete, **kwargs)
        for _, recibida in respuestas:
            mac = recibida.hwsrc.upper()
            ip = recibida.psrc
            dispositivos_detectados.append({"mac": mac, "ip": ip})
    except Exception as e:
        logging.error(f"Error durante el escaneo ARP: {e}")

    return dispositivos_detectados


def enviar_dispositivo_api(url, mac, agente_id):
    """Envía la dirección MAC a la API REST del backend."""
    timestamp_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "mac": mac,
        "timestamp": timestamp_iso,
        "agente_id": agente_id
    }
    try:
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        if resp.status_code in (200, 201, 202):
            return True
        else:
            logging.warning(f"[ALERTA] MAC {mac} enviada pero HTTP {resp.status_code}: {resp.text}")
            return False
    except requests.RequestException as req_err:
        logging.error(f"[ERROR RED] No se pudo enviar MAC {mac} a {url}: {req_err}")
        return False


# =====================================================
# Estado Global y Métricas del Agente
# =====================================================
class AgentState:
    def __init__(self):
        self.running = True
        self.paused = False
        self.status = "Conectado"
        self.start_time = time.time()
        self.last_scan_time = None
        self.devices_last_scan = 0
        self.total_scans = 0
        self.total_envios_exitosos = 0
        self.total_envios_fallidos = 0
        self.scan_trigger = threading.Event()
        self.tray_icon = None

agent_state = AgentState()


# =====================================================
# Dashboard Web HTML / CSS / JS (v1.1 Minimalista Neutro)
# =====================================================
DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EYES Agent v1.1 - Dashboard</title>
  <style>
    :root {
      --bg-base: #0f172a;
      --bg-surface: #1e293b;
      --bg-card: #334155;
      --border: #475569;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg-base); color: var(--text-main); min-height: 100vh; padding: 24px; }
    .container { max-width: 1000px; margin: 0 auto; }
    
    header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 36px; height: 36px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .brand-title { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .brand-sub { font-size: 13px; color: var(--text-muted); }
    
    .badge { padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid var(--success); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid var(--warning); }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .card-label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 8px; }
    .card-value { font-size: 26px; font-weight: 700; }
    .card-foot { font-size: 12px; color: var(--text-muted); margin-top: 6px; }

    .actions-bar { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
    .btn { background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border); padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
    .btn:hover { background: var(--border); }
    .btn-primary { background: var(--primary); border-color: var(--primary); }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-warning { background: rgba(245, 158, 11, 0.2); border-color: var(--warning); color: var(--warning); }
    .btn-danger { background: rgba(239, 68, 68, 0.2); border-color: var(--danger); color: var(--danger); }
    
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
    .tab { padding: 10px 16px; font-size: 14px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }
    
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text-main); }
    .form-input { width: 100%; background: var(--bg-base); border: 1px solid var(--border); color: var(--text-main); padding: 10px 14px; border-radius: 8px; font-size: 14px; }
    .form-input:focus { outline: none; border-color: var(--primary); }
    .form-help { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    .log-box { background: #000000; border: 1px solid var(--border); border-radius: 8px; padding: 16px; font-family: "Courier New", Courier, monospace; font-size: 13px; height: 380px; overflow-y: auto; color: #a3e635; line-height: 1.5; white-space: pre-wrap; }
    
    .toast { position: fixed; bottom: 20px; right: 20px; background: var(--bg-surface); border: 1px solid var(--primary); padding: 12px 20px; border-radius: 8px; font-size: 14px; display: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">EYE</div>
        <div>
          <div class="brand-title">EYES Agent v1.1</div>
          <div class="brand-sub">Panel de Control & Monitor de Red ARP</div>
        </div>
      </div>
      <div id="status-badge" class="badge badge-success">Conectado</div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-label">Dispositivos Último Escaneo</div>
        <div class="card-value" id="stat-devices">0</div>
        <div class="card-foot" id="stat-last-scan">Esperando primer escaneo...</div>
      </div>
      <div class="card">
        <div class="card-label">Escaneos Totales</div>
        <div class="card-value" id="stat-scans">0</div>
        <div class="card-foot" id="stat-uptime">Uptime: 0s</div>
      </div>
      <div class="card">
        <div class="card-label">Envíos Exitosos</div>
        <div class="card-value" style="color: var(--success);" id="stat-exitosos">0</div>
        <div class="card-foot" id="stat-fallidos">Fallidos: 0</div>
      </div>
      <div class="card">
        <div class="card-label">Hostname & IP Local</div>
        <div class="card-value" style="font-size: 18px;" id="stat-host">-</div>
        <div class="card-foot" id="stat-platform">-</div>
      </div>
    </div>

    <div class="actions-bar">
      <button class="btn btn-primary" onclick="accion('scan_now')">Escanear Ahora</button>
      <button class="btn btn-warning" id="btn-pause" onclick="togglePausa()">Pausar Escaneo</button>
      <button class="btn" onclick="accion('restart')">Reiniciar Agente</button>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="setTab('general')">Vista General</div>
      <div class="tab" onclick="setTab('config')">Configuración</div>
      <div class="tab" onclick="setTab('logs')">Visor de Logs</div>
    </div>

    <div id="tab-general" class="tab-content active">
      <div class="card">
        <h3 style="margin-bottom: 12px; font-size: 16px;">Parámetros Activos</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
          <div><strong style="color: var(--text-muted);">Rango de Red:</strong> <span id="info-range">-</span></div>
          <div><strong style="color: var(--text-muted);">Interfaz:</strong> <span id="info-iface">-</span></div>
          <div><strong style="color: var(--text-muted);">Endpoint Backend:</strong> <span id="info-url">-</span></div>
          <div><strong style="color: var(--text-muted);">Intervalo:</strong> <span id="info-interval">-</span></div>
        </div>
      </div>
    </div>

    <div id="tab-config" class="tab-content">
      <div class="card">
        <h3 style="margin-bottom: 16px; font-size: 16px;">Configuración del Agente</h3>
        <form id="form-config" onsubmit="guardarConfig(event)">
          <div class="form-group">
            <label class="form-label">Rango de Red (CIDR)</label>
            <input type="text" id="cfg-range" class="form-input" placeholder="ej. 192.168.1.0/24 o auto">
            <div class="form-help">Usa "auto" para detectar automáticamente la subred /24 activa.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Interfaz de Red</label>
            <input type="text" id="cfg-iface" class="form-input" placeholder="ej. Wi-Fi o eth0 (opcional)">
          </div>
          <div class="form-group">
            <label class="form-label">URL API Endpoint Backend</label>
            <input type="text" id="cfg-url" class="form-input" placeholder="http://192.168.1.100:8010/api/deteccion">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Intervalo de Escaneo (seg)</label>
              <input type="number" id="cfg-interval" class="form-input" min="5" max="3600">
            </div>
            <div class="form-group">
              <label class="form-label">Timeout ARP (seg)</label>
              <input type="number" id="cfg-timeout" class="form-input" min="1" max="30">
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Guardar Cambios</button>
        </form>
      </div>
    </div>

    <div id="tab-logs" class="tab-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; color: var(--text-muted);">Últimas líneas de agente.log</span>
        <button class="btn" onclick="fetchLogs()">Actualizar Logs</button>
      </div>
      <div id="log-box" class="log-box">Cargando logs...</div>
    </div>
  </div>

  <div id="toast" class="toast">Mensaje</div>

  <script>
    let isPaused = false;

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3000);
    }

    function setTab(name) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + name).classList.add('active');
      if (name === 'logs') fetchLogs();
    }

    async function updateStatus() {
      try {
        const res = await fetch('/status');
        const d = await res.json();
        
        document.getElementById('stat-devices').innerText = d.devices_last_scan || 0;
        document.getElementById('stat-scans').innerText = d.total_scans || 0;
        document.getElementById('stat-exitosos').innerText = d.total_envios_exitosos || 0;
        document.getElementById('stat-fallidos').innerText = 'Fallidos: ' + (d.total_envios_fallidos || 0);
        document.getElementById('stat-host').innerText = d.hostname || '-';
        document.getElementById('stat-platform').innerText = d.platform || '-';
        document.getElementById('stat-uptime').innerText = 'Uptime: ' + (d.uptime_seconds || 0) + 's';
        
        if (d.last_scan_time) {
          const t = new Date(d.last_scan_time).toLocaleTimeString();
          document.getElementById('stat-last-scan').innerText = 'Último escaneo: ' + t;
        }

        isPaused = d.paused;
        const b = document.getElementById('status-badge');
        const pBtn = document.getElementById('btn-pause');
        
        if (d.paused) {
          b.className = 'badge badge-warning';
          b.innerText = 'En Pausa';
          pBtn.innerText = 'Reanudar Escaneo';
        } else {
          b.className = 'badge badge-success';
          b.innerText = 'Conectado';
          pBtn.innerText = 'Pausar Escaneo';
        }
      } catch(e) {
        const b = document.getElementById('status-badge');
        b.className = 'badge badge-danger';
        b.innerText = 'Desconectado';
      }
    }

    async function loadConfig() {
      try {
        const res = await fetch('/config');
        const d = await res.json();
        document.getElementById('info-range').innerText = d.network_range || 'auto';
        document.getElementById('info-iface').innerText = d.interface || 'Autodetectada';
        document.getElementById('info-url').innerText = d.api_url || '-';
        document.getElementById('info-interval').innerText = (d.interval_seconds || 60) + ' segundos';

        document.getElementById('cfg-range').value = d.network_range || 'auto';
        document.getElementById('cfg-iface').value = d.interface || '';
        document.getElementById('cfg-url').value = d.api_url || '';
        document.getElementById('cfg-interval').value = d.interval_seconds || 60;
        document.getElementById('cfg-timeout').value = d.timeout_seconds || 3;
      } catch(e) {}
    }

    async function accion(type) {
      try {
        const res = await fetch('/' + type, { method: 'POST' });
        const d = await res.json();
        showToast(d.message || 'Acción ejecutada');
        updateStatus();
      } catch(e) { showToast('Error al ejecutar acción'); }
    }

    async function togglePausa() {
      const endpoint = isPaused ? '/resume' : '/pause';
      await accion(endpoint.replace('/', ''));
    }

    async function guardarConfig(e) {
      e.preventDefault();
      const body = {
        network_range: document.getElementById('cfg-range').value,
        interface: document.getElementById('cfg-iface').value || null,
        api_url: document.getElementById('cfg-url').value,
        interval_seconds: parseInt(document.getElementById('cfg-interval').value),
        timeout_seconds: parseInt(document.getElementById('cfg-timeout').value)
      };

      try {
        const res = await fetch('/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const d = await res.json();
        showToast(d.message || 'Configuración guardada');
        loadConfig();
      } catch(e) { showToast('Error al guardar configuración'); }
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/logs?lines=100');
        const d = await res.json();
        const box = document.getElementById('log-box');
        box.innerText = d.content || 'Sin logs disponibles';
        box.scrollTop = box.scrollHeight;
      } catch(e) {}
    }

    setInterval(updateStatus, 3000);
    updateStatus();
    loadConfig();
  </script>
</body>
</html>
"""


# =====================================================
# Servidor HTTP de Control y API REST
# =====================================================
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Servidor HTTP multihilo no bloqueante."""
    daemon_threads = True


class AgenteControlHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

    def _send_json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _validar_token(self):
        config = cargar_configuracion()
        expected_token = config.get("secret_token") or os.environ.get("AGENTE_SECRET_TOKEN")
        if not expected_token:
            return True

        header_token = self.headers.get("X-Agent-Token")
        query_token = None
        if "?" in self.path:
            from urllib.parse import parse_qs, urlparse
            query_params = parse_qs(urlparse(self.path).query)
            query_token = query_params.get("token", [None])[0]

        token_recibido = header_token or query_token
        if token_recibido == expected_token:
            return True

        self._send_json(401, {"error": "Acceso no autorizado. Token inválido."})
        return False

    def do_GET(self):
        clean_path = self.path.split("?")[0]

        # Servir el Dashboard HTML en la raíz
        if clean_path in ("/", "/index.html", "/dashboard.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(DASHBOARD_HTML.encode("utf-8"))
            return

        if not self._validar_token():
            return

        if clean_path == "/status":
            uptime = int(time.time() - agent_state.start_time)
            self._send_json(200, {
                "running": agent_state.running,
                "paused": agent_state.paused,
                "status": agent_state.status,
                "pid": os.getpid(),
                "hostname": socket.gethostname(),
                "platform": f"{platform.system()} {platform.release()}",
                "uptime_seconds": uptime,
                "last_scan_time": agent_state.last_scan_time,
                "devices_last_scan": agent_state.devices_last_scan,
                "total_scans": agent_state.total_scans,
                "total_envios_exitosos": agent_state.total_envios_exitosos,
                "total_envios_fallidos": agent_state.total_envios_fallidos,
            })
        elif clean_path == "/logs":
            lines = 150
            if "?" in self.path:
                from urllib.parse import parse_qs, urlparse
                query = parse_qs(urlparse(self.path).query)
                try:
                    lines = int(query.get("lines", [150])[0])
                except ValueError:
                    lines = 150

            data_dir = obtener_data_dir()
            log_path = os.path.join(data_dir, "agente.log")
            if not os.path.exists(log_path):
                self._send_json(404, {"error": "Archivo agente.log no encontrado"})
                return

            try:
                with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                    all_lines = f.readlines()
                    tail = all_lines[-lines:] if len(all_lines) > lines else all_lines
                    self._send_json(200, {
                        "total_lines": len(all_lines),
                        "returned_lines": len(tail),
                        "content": "".join(tail)
                    })
            except Exception as e:
                self._send_json(500, {"error": f"Error al leer logs: {str(e)}"})

        elif clean_path == "/config":
            config = cargar_configuracion()
            self._send_json(200, config)
        elif clean_path in ("/open_panel", "/show_window"):
            webbrowser.open("http://127.0.0.1:5050")
            self._send_json(200, {"ok": True, "message": "Navegador abierto en http://127.0.0.1:5050"})
        else:
            self._send_json(404, {"error": "Endpoint no encontrado"})

    def do_PUT(self):
        if not self._validar_token():
            return

        clean_path = self.path.split("?")[0]
        if clean_path == "/config":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                nuevos_datos = json.loads(body.decode('utf-8'))
                config_actualizada = guardar_configuracion(nuevos_datos)
                self._send_json(200, {"ok": True, "message": "Configuración guardada correctamente.", "config": config_actualizada})
            except Exception as e:
                self._send_json(500, {"error": f"Error al actualizar configuración: {str(e)}"})
        else:
            self._send_json(404, {"error": "Endpoint no encontrado"})

    def do_POST(self):
        if not self._validar_token():
            return

        clean_path = self.path.split("?")[0]
        if clean_path == "/scan_now":
            agent_state.scan_trigger.set()
            self._send_json(200, {"ok": True, "message": "Escaneo inmediato activado."})
        elif clean_path == "/pause":
            agent_state.paused = True
            agent_state.status = "En pausa"
            self._send_json(200, {"ok": True, "message": "Escaneo pausado.", "status": "En pausa"})
        elif clean_path == "/resume":
            agent_state.paused = False
            agent_state.status = "Conectado"
            self._send_json(200, {"ok": True, "message": "Escaneo reanudado.", "status": "Conectado"})
        elif clean_path in ("/show_window", "/open_panel"):
            webbrowser.open("http://127.0.0.1:5050")
            self._send_json(200, {"ok": True, "message": "Navegador abierto."})
        elif clean_path == "/restart":
            self._send_json(200, {"ok": True, "message": "Reiniciando proceso del agente..."})
            def _restart():
                time.sleep(1)
                exe_path = sys.executable
                if getattr(sys, 'frozen', False):
                    subprocess.Popen([exe_path], creationflags=subprocess.DETACHED_PROCESS if IS_WINDOWS else 0)
                else:
                    subprocess.Popen([exe_path, os.path.abspath(__file__)], creationflags=subprocess.DETACHED_PROCESS if IS_WINDOWS else 0)
                os._exit(0)
            threading.Thread(target=_restart, daemon=True).start()
        elif clean_path == "/stop":
            self._send_json(200, {"ok": True, "message": "Deteniendo agente..."})
            def _stop():
                time.sleep(1)
                os._exit(0)
            threading.Thread(target=_stop, daemon=True).start()
        else:
            self._send_json(404, {"error": "Endpoint no encontrado"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Agent-Token")
        self.end_headers()


def iniciar_servidor_control(host="127.0.0.1", port=5050):
    """Inicia el servidor HTTP de control en un hilo daemon."""
    def _run_server():
        try:
            server = ThreadedHTTPServer((host, port), AgenteControlHandler)
            logging.info(f"[CONTROL] Servidor HTTP de control activo en http://{host}:{port}")
            server.serve_forever()
        except Exception as e:
            logging.error(f"[CONTROL] Error en el servidor HTTP de control: {e}")

    t = threading.Thread(target=_run_server, daemon=True)
    t.start()


# =====================================================
# Ícono en la Bandeja del Sistema (System Tray - pystray)
# =====================================================
def crear_imagen_tray(estado="Conectado"):
    """Genera dinámicamente el icono PNG para la bandeja del sistema."""
    img = Image.new("RGBA", (64, 64), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    color_bg = (99, 102, 241, 255) # Indigo
    if estado == "En pausa":
        color_bg = (245, 158, 11, 255) # Amber
    elif estado == "Escaneando":
        color_bg = (16, 185, 129, 255) # Green
    elif estado == "Error":
        color_bg = (239, 68, 68, 255) # Red

    draw.ellipse((4, 4, 60, 60), fill=color_bg)
    draw.ellipse((20, 20, 44, 44), fill=(255, 255, 255, 255))
    draw.ellipse((26, 26, 38, 38), fill=color_bg)
    return img


def iniciar_system_tray():
    """Inicia el icono en la bandeja del sistema."""
    if not TRAY_AVAILABLE:
        logging.info("[TRAY] pystray no disponible. Omitiendo icono en tray.")
        return

    def on_abrir_panel(icon, item):
        webbrowser.open("http://127.0.0.1:5050")

    def on_toggle_pausa(icon, item):
        if agent_state.paused:
            agent_state.paused = False
            agent_state.status = "Conectado"
            logging.info("[TRAY] Escaneo reanudado.")
        else:
            agent_state.paused = True
            agent_state.status = "En pausa"
            logging.info("[TRAY] Escaneo pausado.")

    def on_escanear_ahora(icon, item):
        agent_state.scan_trigger.set()

    def on_salir(icon, item):
        logging.info("[TRAY] Saliendo del agente...")
        icon.stop()
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Abrir panel", on_abrir_panel, default=True),
        pystray.MenuItem("Escanear ahora", on_escanear_ahora),
        pystray.MenuItem(lambda item: "Reanudar escaneo" if agent_state.paused else "Pausar escaneo", on_toggle_pausa),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Salir", on_salir)
    )

    try:
        icon = pystray.Icon(
            "EYES_Agent",
            crear_imagen_tray(agent_state.status),
            title="EYES Agent v1.1 - Conectado",
            menu=menu
        )
        agent_state.tray_icon = icon
        logging.info("[TRAY] Ícono en la bandeja del sistema iniciado.")
        icon.run()
    except Exception as e:
        logging.warning(f"[TRAY] No se pudo iniciar el icono en tray: {e}")


# =====================================================
# Bucle Principal de Escaneo
# =====================================================
def main():
    asegurar_instancia_unica()
    setup_logging()
    agente_hostname = socket.gethostname()
    data_dir = obtener_data_dir()

    logging.info("=" * 60)
    logging.info(f"Iniciando EYES Agent v1.1 - Hostname: {agente_hostname}")
    logging.info(f"Sistema Operativo: {platform.system()} {platform.release()}")
    logging.info(f"Carpeta de Datos: {data_dir}")
    if getattr(sys, 'frozen', False):
        logging.info(f"Ejecutable Compilado: {sys.executable}")
    logging.info("=" * 60)

    config = cargar_configuracion()
    rango_red = config.get("network_range")
    iface = config.get("interface")

    if not rango_red or str(rango_red).lower() == "auto":
        rango_red = detectar_rango_red_auto(interface=iface)
        logging.info(f"Rango de red autodetectado: {rango_red}")
    else:
        logging.info(f"Rango de red configurado: {rango_red}")

    api_url = config.get("api_url", "http://localhost:8010/api/deteccion")
    intervalo = config.get("interval_seconds", 60)
    timeout_scan = config.get("timeout_seconds", 3)
    control_port = config.get("control_port", 5050)

    # Iniciar servidor HTTP de control (Hilo 2)
    iniciar_servidor_control(host="127.0.0.1", port=control_port)

    # Iniciar ícono en System Tray en un hilo daemon (Hilo 3)
    if TRAY_AVAILABLE:
        threading.Thread(target=iniciar_system_tray, daemon=True).start()

    # Bucle principal de escaneo ARP (Hilo 1 - Main)
    try:
        while agent_state.running:
            if agent_state.paused:
                time.sleep(1)
                continue

            config = cargar_configuracion()
            intervalo = config.get("interval_seconds", 60)
            timeout_scan = config.get("timeout_seconds", 3)
            api_url = config.get("api_url", "http://localhost:8010/api/deteccion")
            iface = config.get("interface")

            inicio_escaneo = time.time()
            agent_state.status = "Escaneando"
            dispositivos = realizar_escaneo_arp(rango_red, timeout_seconds=timeout_scan, interface=iface)

            duracion = time.time() - inicio_escaneo
            num_detectados = len(dispositivos)
            agent_state.status = "Conectado"
            agent_state.last_scan_time = datetime.now(timezone.utc).isoformat()
            agent_state.devices_last_scan = num_detectados
            agent_state.total_scans += 1

            logging.info(f"Escaneo completado en {duracion:.2f}s. Dispositivos detectados: {num_detectados}")

            if num_detectados > 0:
                for dev in dispositivos:
                    exito = enviar_dispositivo_api(api_url, dev["mac"], agente_hostname)
                    if exito:
                        agent_state.total_envios_exitosos += 1
                    else:
                        agent_state.total_envios_fallidos += 1

            # Espera normal con soporte para gatillo instantáneo (scan_trigger)
            agent_state.scan_trigger.wait(timeout=intervalo)
            agent_state.scan_trigger.clear()

    except KeyboardInterrupt:
        logging.info("Interrupción por el usuario. Finalizando agente limpiamente.")
        sys.exit(0)
    except Exception as e:
        logging.critical(f"Error fatal no manejado: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
