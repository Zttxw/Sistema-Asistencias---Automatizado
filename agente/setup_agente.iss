; =====================================================================
; Script de Inno Setup para el Agente de Asistencia (Escáner ARP)
; Genera: Setup_AgenteAsistencia_v1.0.exe en la carpeta /instaladores
; =====================================================================

#define MyAppName "Agente de Asistencia"
#define MyAppVersion "1.0"
#define MyAppPublisher "Sistema de Asistencias"
#define MyAppExeName "AgenteAsistencia.exe"

[Setup]
; ID único de la aplicación generado para Inno Setup
AppId={{8F123A45-6789-4DEF-ABCD-1234567890AB}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}

; Directorio predeterminado de instalación (C:\Program Files\SistemaAsistencias\Agente)
DefaultDirName={autopf}\SistemaAsistencias\Agente
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Carpeta de salida del instalador compilado
OutputDir=..\instaladores
OutputBaseFilename=Setup_AgenteAsistencia_v1.0

; Compresión y apariencia moderna
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern

; Requiere permisos de Administrador para instalar en Program Files y crear inicio en Registro
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
; 1. Copia el ejecutable principal compilado (.exe) a C:\Program Files\SistemaAsistencias\Agente\
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; 2. Copia el archivo config.json a C:\ProgramData\SistemaAsistencias\Agente\ (solo si no existe previo)
Source: "config.json.example"; DestDir: "{commonappdata}\SistemaAsistencias\Agente"; DestName: "config.json"; Flags: onlyifdoesntexist

[Directories]
; Crear la carpeta de datos en ProgramData para logs y configuración
Name: "{commonappdata}\SistemaAsistencias\Agente"; Permissions: users-full

[Registry]
; 1. Variable de entorno de sistema para indicar dónde están los datos (ProgramData)
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; ValueType: string; ValueName: "AGENTE_DATA_DIR"; ValueData: "{commonappdata}\SistemaAsistencias\Agente"; Flags: uninsdeletevalue

; 2. Registro de Inicio Automático con Windows en segundo plano (HKLM Run)
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "AgenteAsistencia"; ValueData: "{app}\{#MyAppExeName}"; Flags: uninsdeletevalue

[Run]
; Inicia el ejecutable inmediatamente al finalizar la instalación
Filename: "{app}\{#MyAppExeName}"; Description: "Ejecutar Agente de Asistencia en segundo plano"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Detiene el proceso del agente antes de desinstalar
Filename: "taskkill.exe"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden
