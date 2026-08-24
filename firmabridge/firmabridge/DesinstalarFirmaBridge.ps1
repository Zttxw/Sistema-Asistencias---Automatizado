<#
.SYNOPSIS
    FirmaBridge - Desinstalador Oficial
    Elimina los procesos, la clave de registro en HKCU y la carpeta %LOCALAPPDATA%\FirmaBridge.
#>

$InstallDir = Join-Path $env:LOCALAPPDATA "FirmaBridge"
$HostName = "pe.gob.pcm.firmabridge"
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  FirmaBridge - Desinstalador" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# 1. Detener procesos de FirmaBridge en ejecucion
Write-Host "[1/3] Deteniendo procesos de FirmaBridge si estan activos..." -ForegroundColor White
try {
    Get-Process -Name "FirmaBridge" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
} catch {}

# 2. Eliminar clave de registro
Write-Host "[2/3] Eliminando clave de registro HKCU..." -ForegroundColor White
if (Test-Path $RegistryPath) {
    try {
        Remove-Item -Path $RegistryPath -Recurse -Force -ErrorAction Stop
        Write-Host " [OK] Clave de registro eliminada de HKCU." -ForegroundColor Green
    } catch {
        Write-Host " [ERROR] No se pudo eliminar la clave de registro: $_" -ForegroundColor Red
    }
} else {
    Write-Host " [INFO] La clave de registro no existia." -ForegroundColor Gray
}

# 3. Eliminar carpeta de instalacion
Write-Host "[3/3] Eliminando carpeta %LOCALAPPDATA%\FirmaBridge..." -ForegroundColor White
if (Test-Path $InstallDir) {
    try {
        # Quitar atributos de solo lectura si existieran
        Get-ChildItem -Path $InstallDir -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $_.Attributes = 'Normal' }
        Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction Stop
        Write-Host " [OK] Carpeta %LOCALAPPDATA%\FirmaBridge eliminada." -ForegroundColor Green
    } catch {
        Write-Host " [ERROR] No se pudo eliminar la carpeta: $_" -ForegroundColor Red
    }
} else {
    Write-Host " [INFO] La carpeta de instalacion no existia." -ForegroundColor Gray
}

Write-Host ""
if (-not (Test-Path $InstallDir)) {
    Write-Host "[EXITO] Desinstalacion de FirmaBridge completada correctamente." -ForegroundColor Green
} else {
    Write-Host "[ADVERTENCIA] No se pudo eliminar por completo %LOCALAPPDATA%\FirmaBridge." -ForegroundColor Red
}
Write-Host ""