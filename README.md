# Sistema de Asistencias Automáticas (Escáner Wi-Fi / ARP + Backend FastAPI + RBAC JWT + Frontend React + Docker)

El **Sistema de Asistencias** es una solución integral multi-componente diseñada para registrar la asistencia de los empleados de forma automatizada mediante la detección de sus dispositivos móviles/laptops conectados a la red local Wi-Fi de la oficina, así como soporte para registro manual de asistencias, auditoría de direcciones MAC, informes semanales de prácticas con hoja membretada oficial y un **Sistema de Autenticación y Autorización Basado en Roles (RBAC)** escalable.

---

## Arquitectura General del Proyecto

```text
Sistema de Asistencias/
├── agente/              -> Cliente liviano Python (Windows) para las PCs de la oficina.
├── backend/             -> API REST en FastAPI con RBAC (JWT + Refresh Tokens) + Base de Datos MySQL (Docker, puerto 8010).
├── frontend/            -> Dashboard Web en React + Vite expuesto vía Nginx (Docker, puerto 8082).
├── docker-compose.yml   -> Orquestador Docker unificado (se ejecuta en la PC servidor con Docker Desktop).
├── deploy_windows.md    -> Instrucciones de despliegue para PC Windows local.
└── .env.example         -> Plantilla de variables de entorno (copiar como .env).
```

### Distribución y Roles de Despliegue

- **`agente/`**: Código que corre en las PCs Windows de la oficina física como sensor ARP. Se instala manualmente en cada PC cliente (vía el ejecutable `.exe` generado con PyInstaller + Inno Setup).
- **`backend/`**: Se despliega en la PC servidor (Windows con Docker Desktop) dentro de un contenedor Docker (`asistencias_backend`, puerto `8010`).
- **`frontend/`**: Se despliega en la PC servidor dentro de un contenedor Docker (`asistencias_frontend`, puerto `8082`).
- **`docker-compose.yml`**: Vive en la raíz del repositorio y se ejecuta en la **PC servidor** con Docker Desktop. La carpeta `agente/` se descarga pero no se utiliza por Docker Compose, lo cual es intencional para mantener el control de versiones unificado.
- **`deploy_vm.sh.obsolete`**: Script de despliegue anterior para la VM Linux. Se conserva como referencia histórica.


---

## Autenticación, Roles y Catálogo de Permisos

El sistema implementa seguridad mediante **Bearer JWT Access Tokens (expiración 60 minutos)** y **Refresh Tokens (expiración 7 días)** almacenados en base de datos con rotación automática.

### Catálogo de Permisos del Sistema

| Código de Permiso | Descripción |
| :--- | :--- |
| `empleados.ver` | Ver lista y detalles del catálogo de empleados |
| `empleados.crear` | Registrar nuevos empleados |
| `empleados.editar` | Editar datos, meta de horas (`horas_meta`) y dirección MAC de empleados |
| `empleados.eliminar` | Desactivar empleados (soft-delete) |
| `asistencias.ver` | Ver reporte general de asistencias de todos los empleados |
| `asistencias.ver_propia` | Ver únicamente su propia asistencia como empleado vinculado |
| `asistencias.registrar_manual` | Registrar entrada/salida manual de asistencias |
| `asistencias.exportar` | Exportar reportes de asistencia a Excel y generar informes PDF semanales de prácticas |
| `dispositivos.ver` | Ver lista de dispositivos no registrados detectados por el agente |
| `dispositivos.registrar` | Convertir un dispositivo no registrado en empleado |
| `roles.gestionar` | Crear, editar y eliminar roles dinámicos y consultar catálogo de permisos |
| `usuarios.gestionar` | Crear, editar y administrar cuentas de usuario |

### Roles Iniciales de Semilla (Seed Initial Data)
1. **Admin**: Posee automáticamente **todos los permisos** del sistema.
2. **Jefe de Oficina**: Asignado a `asistencias.ver`, `asistencias.exportar`, `empleados.ver`, `empleados.crear`, `empleados.editar`.
3. **Empleado**: Asignado al permiso `asistencias.ver_propia` (aislamiento estricto para ver solo sus registros).
4. **Invitado**: Asignado a `asistencias.ver`, `empleados.ver`, `dispositivos.ver` (modo lectura sin acciones).

---

## Endpoints de la API REST

### 1. Autenticación (`/api/auth`)
- **`POST /api/auth/login`**: Inicia sesión con `{ "email": str, "password": str }`. Retorna `access_token` y `refresh_token`.
- **`POST /api/auth/refresh`**: Renueva el `access_token` enviando `{ "refresh_token": str }` (rota el refresh token).
- **`POST /api/auth/logout`**: Revoca el refresh token finalizando la sesión.
- **`GET /api/auth/me`**: Retorna el perfil del usuario autenticado actual, su rol y sus permisos activos.

### 2. Gestión de Roles y Permisos (`/api/roles` & `/api/permisos`)
- **`GET /api/roles`**: Lista roles con sus permisos asociados (`roles.gestionar`).
- **`POST /api/roles`**: Crea un rol asignándole permisos dinámicos (`roles.gestionar`).
- **`PUT /api/roles/{id}`**: Edita nombre, descripción o permisos de un rol (`roles.gestionar`).
- **`DELETE /api/roles/{id}`**: Elimina un rol sin usuarios asignados (`roles.gestionar`).
- **`GET /api/permisos`**: Lista el catálogo completo de permisos disponibles (`roles.gestionar`).

### 3. Gestión de Usuarios (`/api/usuarios`)
- **`GET /api/usuarios`**: Lista usuarios registrados (`usuarios.gestionar`).
- **`POST /api/usuarios`**: Crea una cuenta de usuario (`usuarios.gestionar`).
- **`PUT /api/usuarios/{id}`**: Modifica credenciales, rol o estado activo (`usuarios.gestionar`).
- **`DELETE /api/usuarios/{id}`**: Desactiva un usuario (`usuarios.gestionar`).

### 4. Empleados, Asistencias e Informes PDF (`/api/empleados` & `/api/asistencias`)
- **`GET /api/empleados`**: Lista empleados con `horas_meta`. Requiere `empleados.ver`.
- **`POST /api/empleados`**: Crea empleado permitiendo especificar `horas_meta`. Requiere `empleados.crear`.
- **`PUT /api/empleados/{id}`**: Edita datos o `horas_meta` del empleado. Requiere `empleados.editar`.
- **`DELETE /api/empleados/{id}`**: Requiere `empleados.eliminar`.
- **`GET /api/empleados/{id}/informe_pdf?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`**: Genera y descarga el informe PDF de prácticas de asistencia agrupado por semanas calendario (lunes a domingo) con hoja membretada y espacio para firma física externa. Parámetros `fecha_inicio` y `fecha_fin` obligatorios. Requiere `asistencias.exportar`.
- **`GET /api/asistencias`**: Requiere `asistencias.ver` o `asistencias.ver_propia`.
- **`POST /api/asistencia/manual`**: Requiere `asistencias.registrar_manual`.
- **`GET /api/asistencias/export`**: Exportar reporte a Excel (`.xlsx`). Requiere `asistencias.exportar`.

### 5. Integración Firma Perú (`/api/firmaperu`)
- **`POST /api/firmaperu/preparar-firma`**: Genera un token efímero (`param_token`, TTL 10 min) y el PDF preliminar del practicante. Requiere rol autorizado (`Administrador`, `Ingeniero`, `Jefatura`).
- **`POST /api/firmaperu/param`**: Consumido por el Firmador Java en PC del Ingeniero. Retorna configuración PAdES codificada en Base64 y cambia el estado del token a `emitido`.
- **`GET /api/firmaperu/documento/{token}`**: Consumido por el Firmador Java para descargar el PDF preliminar.
- **`POST /api/firmaperu/subir-firmado/{token}`**: Consumido por el Firmador Java. Exige estado `emitido` y valida la firma digital PAdES/PKCS#7 usando `pyHanko`.

> ⚠️ **Configuración para Producción (CAs Oficiales RENIEC/PCM)**:
> Por defecto el sistema funciona en **Modo Desarrollo** (valida la integridad del hash `/ByteRange` pero advierte que no hay cadena de confianza oficial). Para validar la cadena de certificados oficial en producción (DNIe / RENIEC / SGTD), se debe configurar en `.env`:
> ```env
> FIRMAPERU_TRUST_ROOTS_PATH=/ruta/a/bundle_ca_oficiales.pem
> ```

---

## Ejemplos de Peticiones `curl` con JWT Header

### 1. Login de Administrador
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sistema.com", "password": "admin123"}'
```

### 2. Descargar Informe PDF de Prácticas por Semanas (Guardar con `-o`)
```bash
curl -X GET "http://localhost:8001/api/empleados/1/informe_pdf?fecha_inicio=2026-11-16&fecha_fin=2026-11-22" \
  -H "Authorization: Bearer <TU_ACCESS_TOKEN>" \
  -o informe_practicas_empleado1.pdf
```

### 3. Crear Empleado con Meta de Horas (`horas_meta`)
```bash
curl -X POST http://localhost:8001/api/empleados \
  -H "Authorization: Bearer <TU_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Practicante Ejemplo",
    "documento": "77889900",
    "mac": "11:22:33:44:55:66",
    "departamento": "OTI",
    "horas_meta": 640
  }'
```

---

## Ejecución Rápida (Docker Desktop en PC Windows)

```powershell
# 1. Copiar y configurar el archivo de variables de entorno
copy .env.example .env
notepad .env    # Ajustar SERVER_HOST, contraseñas MySQL, etc.

# 2. Levantar el stack
docker compose up -d --build
```

Para instrucciones detalladas, ver **[deploy_windows.md](deploy_windows.md)**.

- Frontend Dashboard: `http://<SERVER_HOST>:8082` (o `http://localhost:8082` desde la misma PC)
- API REST Backend: `http://<SERVER_HOST>:8010` (o `http://localhost:8010`)
- Swagger Docs interactivo: `http://<SERVER_HOST>:8010/docs`

> `<SERVER_HOST>` es la IP LAN configurada en `.env`. Obtenerla con `ipconfig` en la PC servidor.
