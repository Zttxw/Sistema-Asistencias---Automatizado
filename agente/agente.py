#!/usr/bin/env python3
"""
Agente de Asistencia (Multiplataforma: Linux / Windows)
Escanea dispositivos en la red local mediante ARP activo (Scapy)
y envía las direcciones MAC detectadas a una API REST especificada (/api/deteccion).

Rutas de datos (config.json, agente.log):
  - Si existe la variable de entorno AGENTE_DATA_DIR, usa esa ruta
    (configurada por el instalador / Tarea Programada apuntando a
     C:\ProgramData\SistemaAsistencias\Agente\)
  - Si no, usa la carpeta donde está el ejecutable (.exe) o el script (.py)
  Esto permite que funcione tanto instalado (Program Files + ProgramData)
  como portátil (todo en la misma carpeta).
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
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
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


IS_WINDOWS = platform.system() == "Windows"


def obtener_data_dir():
    """
    Determina la carpeta de datos (donde viven config.json y agente.log).
    Orden de prioridad:
      1. Variable de entorno AGENTE_DATA_DIR (puesta por el instalador o la Tarea Programada)
      2. Carpeta del ejecutable (.exe compilado con PyInstaller)
      3. Carpeta del script (.py en desarrollo)
    """
    # 1. Variable de entorno explícita (instalación con Inno Setup)
    env_dir = os.environ.get("AGENTE_DATA_DIR")
    if env_dir and os.path.isdir(env_dir):
        return env_dir

    # 2. Ejecutable compilado (PyInstaller --onefile)
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)

    # 3. Script Python normal (desarrollo)
    return os.path.dirname(os.path.abspath(__file__))


def setup_logging():
    """Configuración del sistema de logging (Consola + Archivo agente.log)"""
    log_format = "%(asctime)s [%(levelname)s] %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Limpiar handlers previos si existieran
    if logger.hasHandlers():
        logger.handlers.clear()

    data_dir = obtener_data_dir()
    log_path = os.path.join(data_dir, "agente.log")

    # Handler para archivo de log local con rotación automática (Máx 5MB, 3 copias)
    try:
        file_handler = RotatingFileHandler(log_path, maxBytes=5*1024*1024, backupCount=3, encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(log_format, date_format))
        logger.addHandler(file_handler)
    except PermissionError:
        # Si no puede escribir en la carpeta del exe (ej: Program Files),
        # intenta en ProgramData como fallback
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

    # Handler para consola
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(log_format, date_format))
    logger.addHandler(console_handler)


def cargar_configuracion():
    """
    Carga config.json desde la carpeta de datos.
    Busca en: AGENTE_DATA_DIR > carpeta del ejecutable > carpeta del script.
    Si no existe, busca también en ProgramData como fallback en Windows.
    """
    config_default = {
        "network_range": "auto",
        "api_url": "http://localhost:5000/api/deteccion",
        "interval_seconds": 60,
        "timeout_seconds": 3,
        "interface": None
    }

    # Lista de rutas candidatas para config.json
    rutas_candidatas = []

    data_dir = obtener_data_dir()
    rutas_candidatas.append(os.path.join(data_dir, "config.json"))

    # Fallback: ProgramData en Windows (para instalación con Inno Setup)
    if IS_WINDOWS:
        programdata_dir = os.path.join(
            os.environ.get("ProgramData", r"C:\ProgramData"),
            "SistemaAsistencias", "Agente"
        )
        ruta_pd = os.path.join(programdata_dir, "config.json")
        if ruta_pd not in rutas_candidatas:
            rutas_candidatas.append(ruta_pd)

    # Intentar cargar desde cada ruta candidata
    for ruta_config in rutas_candidatas:
        if os.path.exists(ruta_config):
            try:
                with open(ruta_config, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    for k, v in config_default.items():
                        if k not in config:
                            config[k] = v
                    logging.info(f"Configuración cargada desde: {ruta_config}")
                    return config
            except Exception as e:
                logging.error(f"Error al leer {ruta_config}: {e}")
                continue

    logging.warning("No se encontró config.json en ninguna ruta. Usando configuración por defecto.")
    return config_default


def obtener_ip_local():
    """
    Detecta la dirección IP de la interfaz de red activa enviando un socket UDP de prueba.
    """
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
    """
    Autodetecta la red local /24 basándose en la IP de la interfaz especificada o activa.
    """
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
        logging.warning("No se pudo detectar una interfaz de red activa. Usando 192.168.1.0/24 por defecto.")
        return "192.168.1.0/24"

    network = ipaddress.IPv4Interface(f"{ip_local}/24").network
    return str(network)


def realizar_escaneo_arp(rango_red, timeout_seconds=3, interface=None):
    """
    Realiza un escaneo ARP activo usando Scapy (Ethernet broadcast + ARP request).
    Devuelve una lista de diccionarios con IP y MAC.
    """
    logging.info(f"Iniciando escaneo ARP en {rango_red} (timeout={timeout_seconds}s)...")

    # Construcción de paquete Ethernet broadcast + ARP request
    paquete = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=rango_red)

    kwargs = {
        "timeout": timeout_seconds,
        "retry": 2,
        "verbose": False
    }
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
        logging.error(f"Error durante el escaneo ARP de Scapy: {e}")

    return dispositivos_detectados


def enviar_dispositivo_api(url, mac, agente_id):
    """
    Construye y envía el JSON de detección a la API REST via HTTP POST.
    """
    timestamp_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "mac": mac,
        "timestamp": timestamp_iso,
        "agente_id": agente_id
    }

    try:
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        if resp.status_code in (200, 201, 202):
            logging.info(f"[ÉXITO] MAC {mac} enviada a {url} (HTTP {resp.status_code})")
            return True
        else:
            logging.warning(f"[ALERTA] MAC {mac} enviada pero endpoint respondió HTTP {resp.status_code}: {resp.text}")
            return False
    except requests.RequestException as req_err:
        logging.error(f"[ERROR RED] No se pudo enviar MAC {mac} a {url}: {req_err}")
        return False


# =====================================================
# Métricas compartidas entre el loop de escaneo
# y el mini-servidor HTTP de control
# =====================================================
agent_metrics = {
    "start_time": None,
    "last_scan_time": None,
    "devices_last_scan": 0,
    "total_scans": 0,
    "total_envios_exitosos": 0,
    "total_envios_fallidos": 0,
}


class AgenteControlHandler(BaseHTTPRequestHandler):
    """
    Mini-servidor HTTP para control remoto del agente.
    Endpoints (requieren cabecera 'X-Agent-Token' o parámetro '?token='):
      GET  /status  → Devuelve métricas y estado del agente en JSON.
      GET  /logs    → Devuelve las últimas N líneas del log del agente.
      GET  /config  → Devuelve la configuración actual (config.json).
      PUT  /config  → Actualiza la configuración y reinicia el agente.
      POST /restart → Reinicia el proceso del agente.
    """

    def log_message(self, format, *args):
        """Silenciar logs HTTP del mini-servidor para no ensuciar agente.log."""
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

        self._send_json(401, {"error": "Acceso no autorizado. Token 'X-Agent-Token' inválido o no provisto."})
        return False

    def do_GET(self):
        if not self._validar_token():
            return

        clean_path = self.path.split("?")[0]

        if clean_path == "/status":
            uptime = 0
            if agent_metrics["start_time"]:
                uptime = int(time.time() - agent_metrics["start_time"])

            self._send_json(200, {
                "running": True,
                "pid": os.getpid(),
                "hostname": socket.gethostname(),
                "platform": f"{platform.system()} {platform.release()}",
                "uptime_seconds": uptime,
                "last_scan_time": agent_metrics["last_scan_time"],
                "devices_last_scan": agent_metrics["devices_last_scan"],
                "total_scans": agent_metrics["total_scans"],
                "total_envios_exitosos": agent_metrics["total_envios_exitosos"],
                "total_envios_fallidos": agent_metrics["total_envios_fallidos"],
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
                self._send_json(500, {"error": f"Error al leer logs del agente: {str(e)}"})

        elif clean_path == "/config":
            config = cargar_configuracion()
            self._send_json(200, config)
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
                new_data = json.loads(body.decode('utf-8'))

                data_dir = obtener_data_dir()
                config_path = os.path.join(data_dir, "config.json")

                config_actual = cargar_configuracion()
                for key in ["network_range", "interface", "api_url", "secret_token", "interval_seconds", "timeout_seconds"]:
                    if key in new_data:
                        config_actual[key] = new_data[key]

                os.makedirs(os.path.dirname(config_path), exist_ok=True)
                with open(config_path, "w", encoding="utf-8") as f:
                    json.dump(config_actual, f, indent=2, ensure_ascii=False)

                self._send_json(200, {"ok": True, "message": "Configuración del agente guardada.", "config": config_actual})

                def _restart():
                    time.sleep(1)
                    exe_path = sys.executable
                    if getattr(sys, 'frozen', False):
                        subprocess.Popen([exe_path], creationflags=subprocess.DETACHED_PROCESS if IS_WINDOWS else 0)
                    else:
                        subprocess.Popen([exe_path, os.path.abspath(__file__)], creationflags=subprocess.DETACHED_PROCESS if IS_WINDOWS else 0)
                    os._exit(0)
                threading.Thread(target=_restart, daemon=True).start()

            except Exception as e:
                self._send_json(500, {"error": f"Error al actualizar configuración: {str(e)}"})
        else:
            self._send_json(404, {"error": "Endpoint no encontrado"})

    def do_POST(self):
        if not self._validar_token():
            return

        clean_path = self.path.split("?")[0]
        if clean_path == "/restart":
            self._send_json(200, {"ok": True, "message": "Reiniciando agente..."})
            logging.info("[CONTROL] Señal de reinicio recibida vía HTTP con token válido. Reiniciando proceso...")

            def _restart():
                time.sleep(1)
                exe_path = sys.executable
                if getattr(sys, 'frozen', False):
                    subprocess.Popen([exe_path], creationflags=subprocess.DETACHED_PROCESS if IS_WINDOWS else 0)
                else:
                    subprocess.Popen([exe_path, os.path.abspath(__file__)],
                                     creationflags=subprocess.DETACHED_PROCESS if IS_WINDOWS else 0)
                os._exit(0)

            threading.Thread(target=_restart, daemon=True).start()
        else:
            self._send_json(404, {"error": "Endpoint no encontrado"})

    def do_OPTIONS(self):
        """Soporte CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Agent-Token")
        self.end_headers()


def iniciar_servidor_control(port=5050):
    """Inicia el mini-servidor HTTP de control en un thread daemon."""
    def _run_server():
        try:
            server = HTTPServer(("0.0.0.0", port), AgenteControlHandler)
            logging.info(f"[CONTROL] Mini-servidor HTTP de control escuchando en 0.0.0.0:{port}")
            server.serve_forever()
        except Exception as e:
            logging.error(f"[CONTROL] Error en el servidor de control HTTP: {e}", exc_info=True)

    thread = threading.Thread(target=_run_server, daemon=True)
    thread.start()


def main():
    setup_logging()
    agente_hostname = socket.gethostname()
    data_dir = obtener_data_dir()

    logging.info("=" * 60)
    logging.info(f"Iniciando Agente de Asistencia - Hostname: {agente_hostname}")
    logging.info(f"Sistema operativo: {platform.system()} {platform.release()}")
    logging.info(f"Carpeta de datos: {data_dir}")
    if getattr(sys, 'frozen', False):
        logging.info(f"Ejecutable: {sys.executable}")
    logging.info("=" * 60)

    config = cargar_configuracion()
    
    rango_red = config.get("network_range")
    iface = config.get("interface")

    if not rango_red or str(rango_red).lower() == "auto":
        rango_red = detectar_rango_red_auto(interface=iface)
        logging.info(f"Rango de red autodetectado: {rango_red}")
    else:
        logging.info(f"Rango de red configurado: {rango_red}")

    api_url = config.get("api_url", "http://localhost:5000/api/deteccion")
    intervalo = config.get("interval_seconds", 60)
    timeout_scan = config.get("timeout_seconds", 3)
    control_port = config.get("control_port", 5050)
    iface = config.get("interface")

    logging.info(f"API Endpoint: {api_url}")
    logging.info(f"Intervalo de escaneo: {intervalo} segundos")
    logging.info(f"Timeout ARP scan: {timeout_scan} segundos")
    if iface:
        logging.info(f"Interfaz de red forzada: {iface}")

    # Inicializar métricas y arrancar mini-servidor HTTP de control
    agent_metrics["start_time"] = time.time()
    iniciar_servidor_control(port=control_port)

    try:
        while True:
            inicio_escaneo = time.time()
            dispositivos = realizar_escaneo_arp(rango_red, timeout_seconds=timeout_scan, interface=iface)
            
            num_detectados = len(dispositivos)
            duracion = time.time() - inicio_escaneo
            logging.info(f"Escaneo completado en {duracion:.2f}s. Dispositivos detectados: {num_detectados}")

            # Actualizar métricas
            agent_metrics["last_scan_time"] = datetime.now(timezone.utc).isoformat()
            agent_metrics["devices_last_scan"] = num_detectados
            agent_metrics["total_scans"] += 1

            if num_detectados > 0:
                for dev in dispositivos:
                    mac = dev["mac"]
                    ip = dev["ip"]
                    logging.debug(f"Procesando dispositivo detectado IP: {ip}, MAC: {mac}")
                    exito = enviar_dispositivo_api(api_url, mac, agente_hostname)
                    if exito:
                        agent_metrics["total_envios_exitosos"] += 1
                    else:
                        agent_metrics["total_envios_fallidos"] += 1
            else:
                logging.info("No se detectaron respuestas ARP en este ciclo.")

            logging.info(f"Esperando {intervalo} segundos para el próximo escaneo...")
            time.sleep(intervalo)

    except KeyboardInterrupt:
        logging.info("\n" + "=" * 60)
        logging.info("Interrupción por el usuario (Ctrl+C). Finalizando agente de asistencia de forma limpia.")
        logging.info("=" * 60)
        sys.exit(0)
    except Exception as e:
        logging.critical(f"Error fatal no manejado en el loop principal: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
