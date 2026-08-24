<#
.SYNOPSIS
    FirmaBridge - Instalador Guiado (Fase A - HKCU)
    Automatiza la copia de componentes nativos a %LOCALAPPDATA%\FirmaBridge,
    registra el Native Messaging Host en HKCU, abre Chrome y guia la carga de la extension.
#>

$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $env:LOCALAPPDATA "FirmaBridge"
$ExtensionDir = Join-Path $InstallDir "extension"
$HostName = "pe.gob.pcm.firmabridge"
$ExtensionId = "ejljadcinpcipbfnfmllipodmnnjfncd"
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

# Determinar directorio raiz
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir

# Buscar FirmaBridge.exe
$SourceExe = Join-Path $ScriptDir "native-host\FirmaBridge.exe"
if (-not (Test-Path $SourceExe)) {
    $SourceExe = Join-Path $ProjectRoot "native-host\FirmaBridge.exe"
}
if (-not (Test-Path $SourceExe)) {
    $SourceExe = "C:\Users\jeanpier\Documents\FIRMAPERU\native-host\FirmaBridge.exe"
}

# Buscar carpeta extension
$SourceExt = Join-Path $ScriptDir "extension"
if (-not (Test-Path $SourceExt)) {
    $SourceExt = Join-Path $ProjectRoot "extension"
}
if (-not (Test-Path $SourceExt)) {
    $SourceExt = "C:\Users\jeanpier\Documents\FIRMAPERU\extension"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FirmaBridge - Instalador Minimalista (HKCU)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificacion de Prerrequisitos
Write-Host "[+] Verificando prerrequisitos del sistema..." -ForegroundColor White

# Verificar .NET Framework 4.8+
$DotNet48Present = $false
try {
    $NetReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" -ErrorAction SilentlyContinue
    if ($NetReg -and $NetReg.Release -ge 528040) {
        $DotNet48Present = $true
    }
} catch {}
if (-not $DotNet48Present -and (Test-Path "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe")) {
    $DotNet48Present = $true
}

if (-not $DotNet48Present) {
    Write-Host "[!] ADVERTENCIA: No se detecto .NET Framework 4.8 explicitamente." -ForegroundColor Yellow
} else {
    Write-Host " [OK] .NET Framework 4.8+ verificado." -ForegroundColor Green
}

# Verificar Chrome
$ChromePath = $null
$PossibleChromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
foreach ($cp in $PossibleChromePaths) {
    if (Test-Path $cp) {
        $ChromePath = $cp
        break
    }
}
if (-not $ChromePath) {
    Write-Host "[!] ADVERTENCIA: No se encontro Google Chrome en las rutas predeterminadas." -ForegroundColor Yellow
} else {
    Write-Host " [OK] Google Chrome detectado." -ForegroundColor Green
}

# 2. Creacion de Directorios y Copia de Archivos
Write-Host ""
Write-Host "[1/4] Creando carpeta de instalacion en %LOCALAPPDATA%\FirmaBridge..." -ForegroundColor White
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $ExtensionDir | Out-Null

Write-Host "[2/4] Copiando ejecutable C# y archivos de la extension..." -ForegroundColor White
if (Test-Path $SourceExe) {
    Copy-Item -Path $SourceExe -Destination (Join-Path $InstallDir "FirmaBridge.exe") -Force
    Write-Host "  - FirmaBridge.exe copiado a $InstallDir" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR CRITICO] No se encontro FirmaBridge.exe en $SourceExe" -ForegroundColor Red
    exit 1
}

if (Test-Path $SourceExt) {
    Copy-Item -Path "$SourceExt\*" -Destination $ExtensionDir -Recurse -Force
    Write-Host "  - Extension copiada a $ExtensionDir" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR CRITICO] No se encontro la carpeta de extension en $SourceExt" -ForegroundColor Red
    exit 1
}

# 3. Generacion del Manifest Native Host
$TargetExePath = (Join-Path $InstallDir "FirmaBridge.exe").Replace('\', '\\')
$ManifestPath = Join-Path $InstallDir "$HostName.json"

$ManifestJson = '{' + "`n"
$ManifestJson += '  "name": "' + $HostName + '",' + "`n"
$ManifestJson += '  "description": "FirmaBridge - Lanzador de FirmaPeru para Chrome",' + "`n"
$ManifestJson += '  "path": "' + $TargetExePath + '",' + "`n"
$ManifestJson += '  "type": "stdio",' + "`n"
$ManifestJson += '  "allowed_origins": [' + "`n"
$ManifestJson += '    "chrome-extension://' + $ExtensionId + '/"' + "`n"
$ManifestJson += '  ]' + "`n"
$ManifestJson += '}'

Write-Host "[3/4] Escribiendo archivo de manifiesto NativeMessagingHost..." -ForegroundColor White
[System.IO.File]::WriteAllText($ManifestPath, $ManifestJson, [System.Text.Encoding]::UTF8)

# 4. Registro en HKCU
Write-Host "[4/4] Registrando NativeHost en Registro de Windows (HKCU)..." -ForegroundColor White
$KeyParts = @(
    "HKCU:\Software\Google",
    "HKCU:\Software\Google\Chrome",
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts",
    $RegistryPath
)
foreach ($kp in $KeyParts) {
    if (-not (Test-Path $kp)) {
        New-Item -Path $kp -Force | Out-Null
    }
}
Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value $ManifestPath

# 5. Abrir Chrome
Write-Host ""
Write-Host "Abriendo Google Chrome en la pagina de Extensiones (chrome://extensions)..." -ForegroundColor Cyan
if ($ChromePath) {
    Start-Process -FilePath $ChromePath -ArgumentList "chrome://extensions"
} else {
    Start-Process "chrome://extensions"
}

# 6. Interfaz GUI WinForms Ultra Minimalista (0 Emojis)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "FirmaBridge - Instalacion de Componentes"
$Form.Size = New-Object System.Drawing.Size(600, 500)
$Form.StartPosition = "CenterScreen"
$Form.FormBorderStyle = "FixedDialog"
$Form.MaximizeBox = $false
$Form.MinimizeBox = $true
$Form.BackColor = [System.Drawing.Color]::FromArgb(255, 255, 255)

# Titulo Minimalista
$TitleLabel = New-Object System.Windows.Forms.Label
$TitleLabel.Text = "FirmaBridge"
$TitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$TitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$TitleLabel.Location = New-Object System.Drawing.Point(25, 22)
$TitleLabel.Size = New-Object System.Drawing.Size(530, 32)
$Form.Controls.Add($TitleLabel)

# Subtitulo
$SubLabel = New-Object System.Windows.Forms.Label
$SubLabel.Text = "Componentes nativos registrados. Sigue los 3 pasos en Google Chrome:"
$SubLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
$SubLabel.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$SubLabel.Location = New-Object System.Drawing.Point(25, 56)
$SubLabel.Size = New-Object System.Drawing.Size(530, 24)
$Form.Controls.Add($SubLabel)

# Grupo de Pasos
$StepsGroup = New-Object System.Windows.Forms.GroupBox
$StepsGroup.Text = "Pasos finales en Chrome"
$StepsGroup.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$StepsGroup.Location = New-Object System.Drawing.Point(25, 88)
$StepsGroup.Size = New-Object System.Drawing.Size(530, 210)
$StepsGroup.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$Form.Controls.Add($StepsGroup)

$StepText = "1. En la esquina superior derecha de Chrome, activa 'Modo de desarrollador'." + "`n`n" +
            "2. Haz clic en el boton 'Cargar descomprimida' (arriba a la izquierda)." + "`n`n" +
            "3. Selecciona la siguiente ruta de instalacion:"

$StepLabel = New-Object System.Windows.Forms.Label
$StepLabel.Text = $StepText
$StepLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9.25, [System.Drawing.FontStyle]::Regular)
$StepLabel.ForeColor = [System.Drawing.Color]::FromArgb(51, 65, 85)
$StepLabel.Location = New-Object System.Drawing.Point(16, 26)
$StepLabel.Size = New-Object System.Drawing.Size(500, 105)
$StepsGroup.Controls.Add($StepLabel)

# Caja de Texto de la Ruta
$PathTextBox = New-Object System.Windows.Forms.TextBox
$PathTextBox.Text = $ExtensionDir
$PathTextBox.ReadOnly = $true
$PathTextBox.Font = New-Object System.Drawing.Font("Consolas", 8.75, [System.Drawing.FontStyle]::Regular)
$PathTextBox.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)
$PathTextBox.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$PathTextBox.BorderStyle = "FixedSingle"
$PathTextBox.Location = New-Object System.Drawing.Point(16, 136)
$PathTextBox.Size = New-Object System.Drawing.Size(498, 23)
$StepsGroup.Controls.Add($PathTextBox)

# Boton Copiar Ruta
$CopyBtn = New-Object System.Windows.Forms.Button
$CopyBtn.Text = "Copiar Ruta"
$CopyBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$CopyBtn.Location = New-Object System.Drawing.Point(16, 168)
$CopyBtn.Size = New-Object System.Drawing.Size(150, 30)
$CopyBtn.BackColor = [System.Drawing.Color]::FromArgb(14, 116, 144)
$CopyBtn.ForeColor = [System.Drawing.Color]::White
$CopyBtn.FlatStyle = "Flat"
$CopyBtn.FlatAppearance.BorderSize = 0
$CopyBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
$CopyBtn.Add_Click({
    [System.Windows.Forms.Clipboard]::SetText($ExtensionDir)
    [System.Windows.Forms.MessageBox]::Show("Ruta copiada al portapapeles. Pegala en el cuadro de dialogo de Chrome.", "FirmaBridge", "OK", "Information")
})
$StepsGroup.Controls.Add($CopyBtn)

# Boton Abrir Carpeta
$OpenFolderBtn = New-Object System.Windows.Forms.Button
$OpenFolderBtn.Text = "Abrir Carpeta"
$OpenFolderBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$OpenFolderBtn.Location = New-Object System.Drawing.Point(176, 168)
$OpenFolderBtn.Size = New-Object System.Drawing.Size(150, 30)
$OpenFolderBtn.BackColor = [System.Drawing.Color]::FromArgb(241, 245, 249)
$OpenFolderBtn.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$OpenFolderBtn.FlatStyle = "Flat"
$OpenFolderBtn.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
$OpenFolderBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
$OpenFolderBtn.Add_Click({
    Start-Process "explorer.exe" -ArgumentList $ExtensionDir
})
$StepsGroup.Controls.Add($OpenFolderBtn)

# Boton Abrir Chrome
$OpenChromeBtn = New-Object System.Windows.Forms.Button
$OpenChromeBtn.Text = "Abrir Chrome"
$OpenChromeBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$OpenChromeBtn.Location = New-Object System.Drawing.Point(336, 168)
$OpenChromeBtn.Size = New-Object System.Drawing.Size(178, 30)
$OpenChromeBtn.BackColor = [System.Drawing.Color]::FromArgb(241, 245, 249)
$OpenChromeBtn.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$OpenChromeBtn.FlatStyle = "Flat"
$OpenChromeBtn.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
$OpenChromeBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
$OpenChromeBtn.Add_Click({
    Start-Process "chrome://extensions"
})
$StepsGroup.Controls.Add($OpenChromeBtn)

# Grupo de Verificacion
$VerifyGroup = New-Object System.Windows.Forms.GroupBox
$VerifyGroup.Text = "Estado del registro"
$VerifyGroup.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$VerifyGroup.Location = New-Object System.Drawing.Point(25, 308)
$VerifyGroup.Size = New-Object System.Drawing.Size(530, 100)
$VerifyGroup.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$Form.Controls.Add($VerifyGroup)

$StatusLabel = New-Object System.Windows.Forms.Label
$StatusLabel.Text = "Estado: Archivos y registro HKCU configurados."
$StatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$StatusLabel.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$StatusLabel.Location = New-Object System.Drawing.Point(16, 24)
$StatusLabel.Size = New-Object System.Drawing.Size(498, 24)
$VerifyGroup.Controls.Add($StatusLabel)

$VerifyBtn = New-Object System.Windows.Forms.Button
$VerifyBtn.Text = "Verificar Registro"
$VerifyBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$VerifyBtn.Location = New-Object System.Drawing.Point(16, 54)
$VerifyBtn.Size = New-Object System.Drawing.Size(220, 32)
$VerifyBtn.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$VerifyBtn.ForeColor = [System.Drawing.Color]::White
$VerifyBtn.FlatStyle = "Flat"
$VerifyBtn.FlatAppearance.BorderSize = 0
$VerifyBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
$VerifyBtn.Add_Click({
    $regVal = (Get-ItemProperty -Path $RegistryPath -ErrorAction SilentlyContinue)."(Default)"
    $exeExists = Test-Path (Join-Path $InstallDir "FirmaBridge.exe")
    $manifestExists = Test-Path $ManifestPath
    $extExists = Test-Path (Join-Path $ExtensionDir "manifest.json")

    if ($regVal -and $exeExists -and $manifestExists -and $extExists) {
        $StatusLabel.Text = "[OK] Host nativo y extension registrados correctamente en el sistema."
        $StatusLabel.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
        [System.Windows.Forms.MessageBox]::Show("Componentes verificados exitosamente:`n- Host C#: OK`n- Manifest JSON: OK`n- Registro HKCU: OK`n- Extension: OK`n`nRecuerda completar la carga en Chrome.", "FirmaBridge Verificacion", "OK", "Information")
    } else {
        $StatusLabel.Text = "[ADVERTENCIA] No se detecto la clave de registro o archivos en %LOCALAPPDATA%\FirmaBridge."
        $StatusLabel.ForeColor = [System.Drawing.Color]::FromArgb(225, 29, 72)
        [System.Windows.Forms.MessageBox]::Show("Atencion: Falta verificar el registro o los archivos en la carpeta de instalacion.", "FirmaBridge Verificacion", "OK", "Warning")
    }
})
$VerifyGroup.Controls.Add($VerifyBtn)

# Boton Finalizar Minimalista
$CloseBtn = New-Object System.Windows.Forms.Button
$CloseBtn.Text = "Finalizar"
$CloseBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$CloseBtn.Location = New-Object System.Drawing.Point(415, 420)
$CloseBtn.Size = New-Object System.Drawing.Size(140, 34)
$CloseBtn.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$CloseBtn.ForeColor = [System.Drawing.Color]::White
$CloseBtn.FlatStyle = "Flat"
$CloseBtn.FlatAppearance.BorderSize = 0
$CloseBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
$CloseBtn.Add_Click({ $Form.Close() })
$Form.Controls.Add($CloseBtn)

[void]$Form.ShowDialog()