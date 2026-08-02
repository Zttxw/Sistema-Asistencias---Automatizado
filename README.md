# Sistema de Asistencias Automáticas (Escáner Wi-Fi / ARP + Backend FastAPI + Frontend React + Docker)

El **Sistema de Asistencias** es una solución integral multi-componente diseñada para registrar la asistencia de los empleados de forma automatizada mediante la detección de sus dispositivos móviles/laptops conectados a la red local Wi-Fi de la oficina, así como soporte para registro manual de asistencias y auditoría de historial de direcciones MAC.

---

## Arquitectura General del Proyecto

```text
Sistema de Asistencias/
├── agente/       -> Cliente liviano Python (Linux/Windows) en la PC de oficina (Sensor puro)
├── backend/      -> API REST en FastAPI + Base de Datos MySQL desplegada en Docker
└── frontend/     -> Dashboard Web en React + Vite + TailwindCSS expuesto en puerto 8082
```

---

## Flujo de Negocio y Endpoints Principales

### 1. Gestión de Empleados y Auditoría de MAC (`/api/empleados`)
- **`GET /api/empleados`**: Lista todos los empleados (activos e inactivos).
- **`POST /api/empleados`**: Crea un nuevo empleado e inserta el primer historial en `HistorialMac` (`mac_anterior: null`, `motivo: "Registro inicial"`).
- **`PUT /api/empleados/{id}`**: Edita campos de empleado. Si cambia la MAC, inserta un nuevo registro de auditoría en `HistorialMac`.
- **`DELETE /api/empleados/{id}`**: Borrado lógico (`activo = False`).
- **`GET /api/empleados/{id}/historial_mac`**: Retorna el historial inmutable de cambios de dirección MAC ordenado descendentemente.
- **`GET /api/empleados/macs`**: Whitelist de MACs activas consumida por el agente.

### 2. Registro de Asistencias (`/api/asistencia`)
- **`POST /api/asistencia`**: Detección automática por presencia Wi-Fi enviada por el agente (`origen_entrada="automatico"` / `origen_salida="automatico"`).
- **`POST /api/asistencia/manual`**: Registro manual de entrada o salida (`origen_entrada="manual"` / `origen_salida="manual"` con `motivo` opcional). Previene entradas duplicadas o salidas sin entrada previa.
- **`GET /api/asistencias?fecha=YYYY-MM-DD`**: Reporte diario con orígenes y motivos.
- **`GET /api/asistencias/export?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`**: Descarga directa de Excel (`.xlsx`) con columnas: `Empleado`, `Departamento`, `Fecha`, `Hora Entrada`, `Hora Salida`, `Origen Entrada`, `Origen Salida`, `Motivo`.

### 3. Descubrimiento de Dispositivos (`/api/dispositivos`)
- **`GET /api/dispositivos/no_registrados?minutos=10`**: Dispositivos vistos recientemente con lookup OUI del Fabricante.

---

## Ejemplos de Peticiones `curl`

### 1. Registro Manual de Entrada
```bash
curl -X POST http://localhost:8001/api/asistencia/manual \
  -H "Content-Type: application/json" \
  -d '{"empleado_id": 1, "tipo": "entrada", "motivo": "Olvidó el celular"}'
```

### 2. Consultar Historial de Cambios de MAC de un Empleado
```bash
curl http://localhost:8001/api/empleados/1/historial_mac
```

---

## Ejecución Rápida (Docker)

```bash
cd backend
docker compose up -d --build
```
- Frontend Dashboard: `http://localhost:8082`
- API REST Backend: `http://localhost:8001`
- Swagger Docs: `http://localhost:8001/docs`
