# FirmaBridge — Plan de Empaquetado e Instalador

Bridge nativo entre Google Chrome y el Firmador oficial de **FirmaPerú (PCM)** para resolver la incompatibilidad de ClickOnce en Chrome.

---

## 📌 Estado del Proyecto: Fase A Implementada (Piloto)

### ¿Por qué requiere un paso guiado en Chrome?
Chrome prohíbe la instalación 100% silenciosa de extensiones descomprimidas a través de scripts por motivos de seguridad. Para un despliegue piloto simple (sin publicar en Chrome Web Store ni configurar políticas de grupo GPO), el usuario solo requiere:
1. **Un solo doble clic** en `InstalarFirmaBridge.exe` (o ejecutar `InstalarFirmaBridge.ps1`).
2. **Dos clics guiados** en Chrome: Activar "Modo de desarrollador" y "Cargar descomprimida".

---

## 🚀 Fase A — Instalador Piloto (Implementado)

### Componentes Incluidos
- **`InstalarFirmaBridge.exe`**: Instalador ejecutable compilado en C# (.NET 4.8 WinForms). No requiere abrir PowerShell ni configurar políticas de ejecución.
- **`InstalarFirmaBridge.ps1`**: Script PowerShell equivalente para entornos que prefieran administración por consola.
- **`native-host/FirmaBridge.exe`**: Binario C# que actúa como puente NativeMessagingHost entre Chrome y `rundll32.exe dfshim.dll,ShOpenVerbApplication`.
- **`extension/`**: Extensión de Chrome Manifest V3 con ID fijo (`ejljadcinpcipbfnfmllipodmnnjfncd`).
- **`DesinstalarFirmaBridge.ps1`**: Script de limpieza total de registros y archivos en `%LOCALAPPDATA%\FirmaBridge`.

### Qué realiza el instalador automáticamente
1. **Verificación de Prerrequisitos**:
   - Confirma la presencia de .NET Framework 4.8+ y Google Chrome.
2. **Copia de Archivos**:
   - Copia `FirmaBridge.exe` y la carpeta `extension/` a `%LOCALAPPDATA%\FirmaBridge\`.
3. **Registro de Native Messaging Host**:
   - Crea el manifest JSON `pe.gob.pcm.firmabridge.json` con rutas absolutas.
   - Registra el puerto nativo en `HKCU:\Software\Google\Chrome\NativeMessagingHosts\pe.gob.pcm.firmabridge`.
4. **Navegación Automática**:
   - Abre Google Chrome automáticamente en `chrome://extensions`.
5. **Asistente GUI con Instrucciones y Verificación**:
   - Muestra una ventana con los 3 pasos visuales.
   - Incluye botón **📋 Copiar Ruta** para pegar directamente en la ventana de diálogo de Chrome.
   - Incluye botón **🔍 Probar Instalación** para verificar que el registro HKCU y los archivos están correctamente asociados.

---

## 🏢 Fase B — Instalación 100% Silenciosa (Rollout Institucional Futuro)

Para cuando el proyecto pase de fase piloto a despliegue masivo institucional a nivel de entidad o municipio sin interacción del usuario en Chrome, existen dos opciones técnicas documentadas:

### Opción B1 — Extensión "No Listada" en Chrome Web Store
- **Descripción**: Publicar la extensión en Chrome Web Store con visibilidad *Unlisted* (no aparece en búsquedas públicas).
- **Despliegue**: Se configura la política de Chrome `ExtensionInstallForcelist` (vía GPO en Active Directory o Registro `HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist`) apuntando al ID de la Web Store.
- **Ventajas**: Chrome descarga, instala y actualiza la extensión de forma 100% silenciosa y automática.
- **Requisitos**: Cuenta de desarrollador en Chrome Web Store ($5 USD pago único) y revisión de seguridad por parte de Google (1 a 3 días).

### Opción B2 — Archivo `.crx` Auto-hospedado
- **Descripción**: Firmar el paquete `.crx` usando la clave privada `key.pem` existente para mantener el mismo Extension ID (`ejljadcinpcipbfnfmllipodmnnjfncd`).
- **Despliegue**: Hospedar el paquete `.crx` y un archivo XML de actualización (`update.xml`) en el servidor web propio de la entidad (ej. la misma VM del Sistema de Asistencias). Configurar `ExtensionInstallForcelist` apuntando a la URL del XML.
- **Ventajas**: Cero dependencia de servicios o aprobaciones externas de Google. Ideal para redes intranet o aisladas.
- **Desventajas**: Requiere mantener el archivo XML de versión en el servidor interno para actualizaciones futuras.

---

## 🛠️ Instrucciones de Uso

### Para Instalar (Modo Piloto):
1. Hacer doble clic en `InstalarFirmaBridge.exe`.
2. En la ventana de Chrome que se abre, activar **Modo de desarrollador** (arriba a la derecha).
3. Hacer clic en **Cargar descomprimida** y seleccionar la carpeta indicada (usar el botón *Copiar Ruta* de la ventana del instalador).

### Para Desinstalar:
Ejecutar `DesinstalarFirmaBridge.ps1` desde PowerShell.
