# Agente de Asistencia (Escáner ARP Multiplataforma)

Este script (`agente.py`) en Python 3 detecta qué dispositivos (teléfonos móviles, laptops, etc.) están conectados a la red local mediante escaneo **ARP activo** con `scapy`. Por cada dirección MAC detectada en el escaneo, envía una solicitud `HTTP POST` con el estado en formato JSON al endpoint de detección del servidor remoto (`/api/deteccion`).

El agente actúa como un sensor puro: **reporta todas las MACs detectadas** sin aplicar filtrado local. El backend es el encargado de procesar cada MAC (registrar la asistencia si corresponde a un empleado o registrarla como no catalogada).

Funciona de forma idéntica en **Linux** (ej. Fedora, RHEL, Ubuntu) y en **Windows**.

---

## 1. Requisitos de Sistema y Permisos

Debido a que `scapy` envía paquetes de red a nivel de capa de enlace (Ethernet/ARP crudos), se requieren librerías del sistema y permisos elevados en ambas plataformas.

### Linux (Fedora / RHEL / Ubuntu)
1. **Dependencia de Sistema (`libpcap`)**:
   - En Fedora / RHEL / CentOS:
     ```bash
     sudo dnf install libpcap
     ```
   - En Ubuntu / Debian:
     ```bash
     sudo apt update && sudo apt install libpcap-dev
     ```
2. **Permisos de Ejecución**:
   - Requiere permisos de superusuario (`sudo`) para abrir sockets crudos:
     ```bash
     sudo ./venv/bin/python3 agente.py
     ```
   - *Alternativa sin sudo*: Se puede otorgar capacidades al binario de Python:
     ```bash
     sudo setcap cap_net_raw,cap_net_admin=eip $(which python3)
     ```

### Windows
1. **Dependencia de Sistema (Npcap)**:
   - Descargar e instalar **Npcap** desde [https://npcap.com](https://npcap.com).
   - **CRÍTICO**: Durante la instalación de Npcap, asegúrese de marcar la casilla:  
     `[X] Install Npcap in WinPcap API-compatible Mode`.
2. **Permisos de Ejecución**:
   - Abrir **Símbolo del sistema (cmd)** o **PowerShell** haciendo clic derecho y seleccionando **"Ejecutar como administrador"**.
   - Ejecutar desde la consola de administrador:
     ```cmd
     python agente.py
     ```

---

## 2. Instalación y Configuración

### Pasos de Instalación

1. Clonar o copiar los archivos del proyecto a la carpeta deseada.
2. Crear y activar un entorno virtual de Python:
   - **Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows**:
     ```cmd
     python -m venv venv
     venv\Scripts\activate
     ```
3. Instalar las dependencias de Python:
   ```bash
   pip install -r requirements.txt
   ```

---

## 3. Archivo de Configuración (`config.json`)

El archivo `config.json` define los parámetros de red y conexión del agente:

```json
{
  "network_range": "192.168.0.0/24",
  "interface": "wlo1",
  "api_url": "http://localhost:8001/api/deteccion",
  "interval_seconds": 60,
  "timeout_seconds": 3,
  "_comment_timeout": "Nota: si la red tiene muchos dispositivos (30+) y se detectan menos MACs de las esperadas, subir timeout_seconds a 5-8 segundos."
}
```

### Explicación de Parámetros:
- `interface`: Nombre explícito de la interfaz de red a escanear (ej. `"wlo1"`, `"eth0"`, `"Wi-Fi"`, o `null` para interfaz por defecto).
  > **RECOMENDACIÓN CRÍTICA PARA SISTEMAS MULTI-INTERFAZ**: En equipos que cuentan con múltiples interfaces de red activas (por ejemplo, cable Ethernet `eno1` + interfaz Wi-Fi `wlo1`), se **recomienda ampliamente especificar la interfaz manualmente** (ej. `"interface": "wlo1"`). Si se deja en `null` o `"auto"`, la autodetección de socket puede seleccionar la interfaz predeterminada del gateway (Ethernet en lugar de Wi-Fi).
- `network_range`: Rango CIDR a escanear (ej: `"192.168.0.0/24"`). Si se especifica `"auto"` o `null`, el agente intentará autodetectar la subred `/24` asociada a la interfaz configurada o activa.
- `api_url`: Endpoint remoto al cual enviar las peticiones HTTP POST por cada MAC detectada (ej: `"http://localhost:8001/api/deteccion"`).
- `interval_seconds`: Tiempo de espera en segundos entre cada ciclo completo de escaneo (ej: `60`).
- `timeout_seconds`: Tiempo máximo de espera en segundos para las respuestas ARP broadcast (default: `3`).
  > **Nota de Ajuste de Red**: En redes saturadas o con más de 30-50 dispositivos conectados simultáneamente, se recomienda aumentar `timeout_seconds` a **5 a 8 segundos** si se observa que algunas MACs tardan en responder.

---

## 4. Estructura del Payload JSON

Por cada dispositivo activo detectado en el escaneo ARP, el agente realiza un `POST` enviando el siguiente cuerpo JSON:

```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "timestamp": "2026-08-02T14:50:00.123456+00:00",
  "agente_id": "HOSTNAME-DEL-EQUIPO"
}
```

---

## 5. Pruebas Locales y Tests Unitarios

1. Ejecutar las pruebas unitarias:
   ```bash
   python3 -m unittest test_agente.py
   ```

2. Ejecutar el agente con permisos elevados:
   - **Linux**: `sudo ./venv/bin/python3 agente.py`
   - **Windows**: `venv\Scripts\python.exe agente.py`

---

## 6. Logs y Manejo de Interrupciones

- **Archivo `agente.log`**: Registra eventos con fecha, hora y nivel de log (`INFO`, `WARNING`, `ERROR`, `DEBUG`). Reporta dispositivos detectados enviados y respuestas del endpoint HTTP.
- **Tolerancia a Fallos**: Si el servidor remoto responde con códigos de alerta o la conexión cae temporalmente, el agente registrará la alerta y continuará ejecutando los siguientes ciclos sin crashear.
- **Cierre Limpio**: Presione `Ctrl + C` en cualquier momento para detener el agente de manera limpia.
