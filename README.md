# Sistema de Asistencias Automáticas (Escáner Wi-Fi / ARP + Backend FastAPI + RBAC JWT + Frontend React + Docker)

El **Sistema de Asistencias** es una solución integral multi-componente diseñada para registrar la asistencia de los empleados de forma automatizada mediante la detección de sus dispositivos móviles/laptops conectados a la red local Wi-Fi de la oficina, así como soporte para registro manual de asistencias, auditoría de direcciones MAC y un **Sistema de Autenticación y Autorización Basado en Roles (RBAC)** escalable.

---

## Arquitectura General del Proyecto

```text
Sistema de Asistencias/
├── agente/       -> Cliente liviano Python (Linux/Windows) en la PC de oficina (Sensor puro público)
├── backend/      -> API REST en FastAPI con RBAC (JWT + Refresh Tokens) + Base de Datos MySQL en Docker
└── frontend/     -> Dashboard Web en React + Vite + TailwindCSS expuesto en puerto 8082
```

---

## Autenticación, Roles y Catálogo de Permisos

El sistema implementa seguridad mediante **Bearer JWT Access Tokens (expiración 60 minutos)** y **Refresh Tokens (expiración 7 días)** almacenados en base de datos con rotación automática.

### Catálogo de Permisos del Sistema

| Código de Permiso | Descripción |
| :--- | :--- |
| `empleados.ver` | Ver lista y detalles del catálogo de empleados |
| `empleados.crear` | Registrar nuevos empleados |
| `empleados.editar` | Editar datos y dirección MAC de empleados |
| `empleados.eliminar` | Desactivar empleados (soft-delete) |
| `asistencias.ver` | Ver reporte general de asistencias de todos los empleados |
| `asistencias.ver_propia` | Ver únicamente su propia asistencia como empleado vinculado |
| `asistencias.registrar_manual` | Registrar entrada/salida manual de asistencias |
| `asistencias.exportar` | Exportar reportes de asistencia a archivos Excel (`.xlsx`) |
| `dispositivos.ver` | Ver lista de dispositivos no registrados detectados por el agente |
| `dispositivos.registrar` | Convertir un dispositivo no registrado en empleado |
| `roles.gestionar` | Crear, editar y eliminar roles dinámicos y consultar catálogo de permisos |
| `usuarios.gestionar` | Crear, editar y administrar cuentas de usuario |

### Roles Iniciales de Semilla (Seed Initial Data)
1. **Admin**: Posee automáticamente **todos los permisos** del sistema.
2. **Empleado**: Asignado al permiso `asistencias.ver_propia` (aislamiento estricto para ver solo sus registros).
3. **Invitado**: Asignado a `asistencias.ver`, `empleados.ver`, `dispositivos.ver` (modo lectura sin acciones).

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

### 4. Empleados, Asistencias y Dispositivos (Endpoints Protegidos)
- **`GET /api/empleados`**: Requiere `empleados.ver`.
- **`POST /api/empleados`**: Requiere `empleados.crear`.
- **`PUT /api/empleados/{id}`**: Requiere `empleados.editar`.
- **`DELETE /api/empleados/{id}`**: Requiere `empleados.eliminar`.
- **`GET /api/asistencias`**: Requiere `asistencias.ver` o `asistencias.ver_propia`.
- **`POST /api/asistencia/manual`**: Requiere `asistencias.registrar_manual`.
- **`GET /api/asistencias/export`**: Requiere `asistencias.exportar`.
- **`GET /api/dispositivos/no_registrados`**: Requiere `dispositivos.ver`.
- **`POST /api/deteccion`**: **PÚBLICO** (consumido por el agente sensor de la oficina).

---

## Ejemplos de Peticiones `curl` con JWT Header

### 1. Login de Administrador
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sistema.com", "password": "<TU_ADMIN_PASSWORD>"}'
```

### 2. Consultar /api/auth/me usando Bearer Token
```bash
curl http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer <TU_ACCESS_TOKEN>"
```

### 3. Crear un Rol Personalizado ("Supervisor")
```bash
curl -X POST http://localhost:8001/api/roles \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Supervisor",
    "descripcion": "Supervisa asistencias y registra faltas manuales",
    "permisos": ["asistencias.ver", "asistencias.registrar_manual", "asistencias.exportar"]
  }'
```

---

## Ejecución Rápida (Docker)

```bash
cd backend
docker compose up -d --build
```
- Frontend Dashboard: `http://localhost:8082`
- API REST Backend: `http://localhost:8001`
- Swagger Docs interactivo: `http://localhost:8001/docs`
