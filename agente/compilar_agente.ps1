# =====================================================================
# Script de Compilación Automática del Agente de Asistencia (Windows)
# Genera AgenteAsistencia.exe y Setup_AgenteAsistencia_v1.0.exe
# =====================================================================

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   COMPILADOR Y EMPAQUETADOR DEL AGENTE DE ASISTENCIAS    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Detectar ejecutable de Python
Write-Host "`n[1/4] Buscando entorno de Python..." -ForegroundColor Yellow
$pythonExe = $null

if (Test-Path "python_embed\python.exe") {
    $pythonExe = (Resolve-Path "python_embed\python.exe").Path
} else {
    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pyCmd) { $pythonExe = $pyCmd.Path }
}

if (-not $pythonExe) {
    Write-Host "  [ERROR] No se encontró Python en el sistema ni en python_embed." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Usando Python en: $pythonExe" -ForegroundColor Green

# Detectar pyinstaller
$pyinstallerExe = $null
if (Test-Path "python_embed\Scripts\pyinstaller.exe") {
    $pyinstallerExe = (Resolve-Path "python_embed\Scripts\pyinstaller.exe").Path
} else {
    $piCmd = Get-Command pyinstaller -ErrorAction SilentlyContinue
    if ($piCmd) { $pyinstallerExe = $piCmd.Path }
}

# 2. Instalar / Verificar dependencias
Write-Host "`n[2/4] Verificando dependencias requeridas (scapy, requests, pyinstaller)..." -ForegroundColor Yellow
& "$pythonExe" -m pip install -r requirements.txt pyinstaller --quiet --no-warn-script-location
Write-Host "  [OK] Dependencias verificadas." -ForegroundColor Green

# Re-detectar pyinstaller tras pip install si fuera necesario
if (-not $pyinstallerExe) {
    if (Test-Path "python_embed\Scripts\pyinstaller.exe") {
        $pyinstallerExe = (Resolve-Path "python_embed\Scripts\pyinstaller.exe").Path
    } else {
        $pyinstallerExe = (Get-Command pyinstaller -ErrorAction SilentlyContinue).Path
    }
}

# 3. Compilar agente.py a AgenteAsistencia.exe con PyInstaller
Write-Host "`n[3/4] Compilando agente.py a ejecutable .exe (segundo plano, sin consola)..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

& "$pyinstallerExe" --noconsole --onefile --name "AgenteAsistencia" --clean agente.py

if (Test-Path "dist\AgenteAsistencia.exe") {
    Write-Host "  [OK] Ejecutable generado exitosamente en: dist\AgenteAsistencia.exe" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Falló la creación de dist\AgenteAsistencia.exe" -ForegroundColor Red
    exit 1
}

# 4. Compilar con Inno Setup (buscando ISCC.exe)
Write-Host "`n[4/4] Buscando compilador de Inno Setup (ISCC.exe)..." -ForegroundColor Yellow
$isccPaths = @(
    "$env:LOCALAPPDATA\Programs\Antigravity IDE\resources\app\node_modules\innosetup\bin\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 7\ISCC.exe",
    (Get-Command iscc -ErrorAction SilentlyContinue).Path
)

$isccPath = $isccPaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($isccPath) {
    Write-Host "  Encontrado Inno Setup en: $isccPath" -ForegroundColor Cyan
    Write-Host "  Compilando instalador Setup_AgenteAsistencia_v1.0.exe..." -ForegroundColor Yellow
    & "$isccPath" "setup_agente.iss"
    
    $finalSetup = "..\instaladores\Setup_AgenteAsistencia_v1.0.exe"
    if (Test-Path $finalSetup) {
        Write-Host "`n==========================================================" -ForegroundColor Green
        Write-Host "   ¡ÉXITO TOTAL! INSTALADOR CREADO EN:" -ForegroundColor Green
        Write-Host "   $((Resolve-Path $finalSetup).Path)" -ForegroundColor White
        Write-Host "==========================================================" -ForegroundColor Green
    }
} else {
    Write-Host "  [ERROR] No se encontró ISCC.exe (Inno Setup Compiler)." -ForegroundColor Red
}
