# Despliegue en PC Windows Local (Docker Desktop)

> [!IMPORTANT]
> Este documento reemplaza al antiguo `deploy_vm.sh` (ahora `deploy_vm.sh.obsolete`).
> El Sistema de Asistencias ya **no** se despliega en la VM `10.0.30.50`, sino
> localmente en una PC Windows de oficina con Docker Desktop.

---

## Requisitos Previos

1. **Docker Desktop para Windows** instalado y corriendo (con backend WSL2).
   - Descargar: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Verificar que WSL2 esté habilitado en la configuración de Docker Desktop.

2. **Git** instalado (para clonar el repositorio).
   - Descargar: [https://git-scm.com/download/win](https://git-scm.com/download/win)

3. **IP fija o reserva DHCP** configurada en el router de la oficina para esta PC.
   - Ver sección [Configuración de IP Fija](#configuración-de-ip-fija-obligatorio).

---

## Paso 1: Clonar el Repositorio

Abrir **PowerShell** o **Git Bash** y ejecutar:

```powershell
cd C:\Proyectos   # o la carpeta que prefieras
git clone <URL_DEL_REPOSITORIO> "Sistema de Asistencias"
cd "Sistema de Asistencias"
```

---

## Paso 2: Configurar Variables de Entorno

Copiar el archivo de ejemplo y editarlo:

```powershell
copy .env.example .env
notepad .env
```

### Variables a configurar en `.env`:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SERVER_HOST` | IP LAN de esta PC (ver `ipconfig`) o `localhost` si solo se accede desde esta PC | `192.168.1.100` |
| `VITE_API_URL` | URL del API para el frontend. Debe usar la misma IP que `SERVER_HOST` | `http://192.168.1.100:8010` |
| `MYSQL_DB` | Nombre de la base de datos | `asistencias` |
| `MYSQL_USER` | Usuario MySQL de la aplicación | `asistencias_user` |
| `MYSQL_PASSWORD` | Contraseña del usuario MySQL | *(cambiar por una segura)* |
| `MYSQL_ROOT_PASSWORD` | Contraseña root de MySQL | *(cambiar por una segura)* |

> [!WARNING]
> Si otras PCs de la oficina (agentes, navegadores) necesitan acceder al backend
> o al dashboard, **`SERVER_HOST` DEBE ser la IP LAN** de esta PC, NO `localhost`.
> Obtener la IP con: `ipconfig` → buscar **"Dirección IPv4"** en la interfaz
> Ethernet o Wi-Fi activa.

---

## Paso 3: Levantar el Stack con Docker

### Opción A: Comandos manuales

```powershell
# 1. Verificar que Docker Desktop esté corriendo
docker info

# 2. Construir y levantar los servicios
docker compose up -d --build

# 3. Verificar que los 3 contenedores estén corriendo
docker compose ps
```

### Opción B: Script PowerShell automatizado

Guardar como `deploy.ps1` en la raíz del proyecto y ejecutar con:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

```powershell
# deploy.ps1 — Script de despliegue para Windows
Write-Host "=== DESPLIEGUE SISTEMA DE ASISTENCIAS (Docker Desktop) ===" -ForegroundColor Cyan

# 1. Verificar Docker Desktop
Write-Host "`n[1/4] Verificando Docker Desktop..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "  [OK] Docker Desktop está corriendo." -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Docker Desktop no está corriendo." -ForegroundColor Red
    Write-Host "  Inicie Docker Desktop y espere a que esté listo antes de continuar." -ForegroundColor Red
    exit 1
}

# 2. Verificar archivo .env
Write-Host "`n[2/4] Verificando archivo .env..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "  [ERROR] No se encontró el archivo .env" -ForegroundColor Red
    Write-Host "  Ejecute: copy .env.example .env" -ForegroundColor Red
    Write-Host "  y configure las variables antes de continuar." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Archivo .env encontrado." -ForegroundColor Green

# 3. Levantar el stack
Write-Host "`n[3/4] Construyendo y levantando contenedores..." -ForegroundColor Yellow
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Falló docker compose up." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Contenedores levantados." -ForegroundColor Green

# 4. Pruebas de salud
Write-Host "`n[4/4] Ejecutando pruebas de salud..." -ForegroundColor Yellow
Start-Sleep -Seconds 8  # Esperar a que los servicios arranquen

# Backend
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:8010/" -UseBasicParsing -TimeoutSec 10
    if ($backend.StatusCode -eq 200) {
        Write-Host "  [OK] Backend API respondió correctamente (HTTP 200)" -ForegroundColor Green
        Write-Host "       Respuesta: $($backend.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [WARN] Backend no respondió en http://localhost:8010/" -ForegroundColor Red
    Write-Host "         Puede que aún esté arrancando. Reintente en unos segundos." -ForegroundColor Yellow
}

# Frontend
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:8082/" -UseBasicParsing -TimeoutSec 10
    if ($frontend.StatusCode -eq 200) {
        Write-Host "  [OK] Frontend respondió correctamente (HTTP 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] Frontend no respondió en http://localhost:8082/" -ForegroundColor Red
    Write-Host "         Puede que aún esté arrancando. Reintente en unos segundos." -ForegroundColor Yellow
}

# Resumen
$serverHost = (Get-Content .env | Select-String "SERVER_HOST=(.*)").Matches.Groups[1].Value
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [EXITO] Despliegue completado." -ForegroundColor Green
Write-Host " - Backend API:     http://${serverHost}:8010" -ForegroundColor White
Write-Host " - Swagger Docs:    http://${serverHost}:8010/docs" -ForegroundColor White
Write-Host " - Web Dashboard:   http://${serverHost}:8082" -ForegroundColor White
Write-Host " - MySQL DB:        Red interna asistencias_net (puerto 3306)" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
```

---

## Paso 4: Verificación Manual de Salud

Desde PowerShell o el navegador de esta PC:

```powershell
# Backend — debe responder JSON con {"status": "ok", ...}
curl http://localhost:8010/

# Frontend — debe responder HTML del dashboard React
curl http://localhost:8082/

# Docker — listar contenedores del stack
docker compose ps
```

Desde **otra PC de la oficina** (reemplazar `192.168.1.100` con la IP real):

```powershell
curl http://192.168.1.100:8010/
curl http://192.168.1.100:8082/
```

---

## Paso 5: Configuración del Windows Firewall

> [!IMPORTANT]
> Si otras PCs de la red local necesitan acceder al backend (agentes) o al
> dashboard web (navegadores), es necesario abrir los puertos 8010 y 8082
> en el Firewall de Windows de esta PC.

### Opción A: PowerShell (como Administrador)

```powershell
# Abrir puerto 8010 (Backend API)
New-NetFirewallRule -DisplayName "Asistencias - Backend API (8010)" `
  -Direction Inbound -Protocol TCP -LocalPort 8010 -Action Allow

# Abrir puerto 8082 (Frontend Web Dashboard)
New-NetFirewallRule -DisplayName "Asistencias - Frontend Web (8082)" `
  -Direction Inbound -Protocol TCP -LocalPort 8082 -Action Allow
```

### Opción B: Interfaz gráfica

1. Abrir **"Firewall de Windows Defender con seguridad avanzada"**
   (`wf.msc` desde Ejecutar o buscar en Inicio).
2. Ir a **Reglas de entrada** → **Nueva regla**.
3. Seleccionar **Puerto** → **TCP** → escribir `8010, 8082`.
4. Seleccionar **Permitir la conexión** → aplicar a todos los perfiles.
5. Nombre: `Sistema de Asistencias`.

---

## Configuración de IP Fija (OBLIGATORIO)

> [!CAUTION]
> Esta PC **debe tener IP fija** (o una reserva DHCP en el router) para que
> la URL `api_url` configurada en los agentes de las demás PCs no se rompa
> si la IP cambia al reiniciar la PC o el router.

### Opción A: IP estática en Windows

1. **Panel de control** → **Centro de redes y recursos compartidos** → **Cambiar configuración del adaptador**.
2. Clic derecho en la interfaz activa (Ethernet/Wi-Fi) → **Propiedades**.
3. Seleccionar **Protocolo de Internet versión 4 (TCP/IPv4)** → **Propiedades**.
4. Marcar **"Usar la siguiente dirección IP"** y configurar:
   - **Dirección IP**: `192.168.1.100` (o la que elijas dentro del rango de tu red)
   - **Máscara de subred**: `255.255.255.0`
   - **Puerta de enlace predeterminada**: `192.168.1.1` (la IP del router)
   - **DNS preferido**: `8.8.8.8` (Google DNS) o el DNS de tu red

### Opción B: Reserva DHCP en el router

1. Acceder al panel de administración del router (generalmente `192.168.1.1`).
2. Buscar la sección **DHCP** → **Reserva de direcciones** (o "Address Reservation").
3. Agregar la dirección MAC de la interfaz de red de esta PC y asignarle una IP fija.
4. La dirección MAC se obtiene con: `ipconfig /all` → buscar **"Dirección física"**.

---

## Comandos Útiles de Mantenimiento

```powershell
# Ver logs en tiempo real de todos los servicios
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Reiniciar un servicio específico
docker compose restart backend

# Detener todo el stack
docker compose down

# Detener y eliminar volúmenes (¡BORRA LA BASE DE DATOS!)
docker compose down -v

# Reconstruir solo el frontend (ej. después de cambiar SERVER_HOST)
docker compose up -d --build frontend

# Reconstruir todo desde cero
docker compose down && docker compose up -d --build
```

---

## Solución de Problemas Comunes

| Problema | Solución |
|---|---|
| `docker info` falla | Iniciar Docker Desktop y esperar a que el ícono de la ballena deje de parpadear |
| El backend no arranca | Revisar logs: `docker compose logs backend`. Verificar que `.env` tenga las credenciales MySQL correctas |
| El frontend muestra error de conexión al API | Verificar que `VITE_API_URL` en `.env` coincide con la IP accesible desde el navegador. **Reconstruir** el frontend: `docker compose up -d --build frontend` |
| Otras PCs no pueden acceder | Verificar Windows Firewall (puertos 8010/8082). Verificar que `SERVER_HOST` sea la IP LAN, no `localhost` |
| La IP de la PC cambió | Configurar IP fija (ver sección anterior). Actualizar `.env` con la nueva IP y reconstruir: `docker compose up -d --build` |
