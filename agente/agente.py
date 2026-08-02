#!/usr/bin/env python3
"""
Agente de Asistencia (Multiplataforma: Linux / Windows)
Escanea dispositivos en la red local mediante ARP activo (Scapy)
y envía las direcciones MAC detectadas a una API REST especificada (/api/deteccion).
"""

import json
import logging
import os
import socket
import sys
import time
from datetime import datetime, timezone
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


# Configuración del sistema de logging (Consola + Archivo agente.log)
def setup_logging():
    log_format = "%(asctime)s [%(levelname)s] %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Limpiar handlers previos si existieran
    if logger.hasHandlers():
        logger.handlers.clear()

    # Handler para archivo de log local
    file_handler = logging.FileHandler("agente.log", encoding="utf-8")
    file_handler.setFormatter(logging.Formatter(log_format, date_format))
    logger.addHandler(file_handler)

    # Handler para consola
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(log_format, date_format))
    logger.addHandler(console_handler)


def cargar_configuracion(ruta_config="config.json"):
    """
    Carga el archivo config.json o retorna valores por defecto en caso de error.
    """
    config_default = {
        "network_range": "auto",
        "api_url": "http://localhost:5000/api/deteccion",
        "interval_seconds": 60,
        "timeout_seconds": 3,
        "interface": None
    }

    if not os.path.exists(ruta_config):
        logging.warning(f"Archivo {ruta_config} no encontrado. Creando valores por defecto.")
        return config_default

    try:
        with open(ruta_config, "r", encoding="utf-8") as f:
            config = json.load(f)
            # Combinar con valores por defecto para asegurar todas las claves
            for k, v in config_default.items():
                if k not in config:
                    config[k] = v
            return config
    except Exception as e:
        logging.error(f"Error al leer {ruta_config}: {e}. Usando configuración por defecto.")
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


def main():
    setup_logging()
    agente_hostname = socket.gethostname()
    logging.info("=" * 60)
    logging.info(f"Iniciando Agente de Asistencia - Hostname: {agente_hostname}")
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
    iface = config.get("interface")

    logging.info(f"API Endpoint: {api_url}")
    logging.info(f"Intervalo de escaneo: {intervalo} segundos")
    logging.info(f"Timeout ARP scan: {timeout_scan} segundos")
    if iface:
        logging.info(f"Interfaz de red forzada: {iface}")

    try:
        while True:
            inicio_escaneo = time.time()
            dispositivos = realizar_escaneo_arp(rango_red, timeout_seconds=timeout_scan, interface=iface)
            
            num_detectados = len(dispositivos)
            logging.info(f"Escaneo completado en {time.time() - inicio_escaneo:.2f}s. Dispositivos detectados: {num_detectados}")

            if num_detectados > 0:
                for dev in dispositivos:
                    mac = dev["mac"]
                    ip = dev["ip"]
                    logging.debug(f"Procesando dispositivo detectado IP: {ip}, MAC: {mac}")
                    enviar_dispositivo_api(api_url, mac, agente_hostname)
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
