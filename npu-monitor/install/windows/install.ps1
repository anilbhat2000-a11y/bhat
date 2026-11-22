<#
.SYNOPSIS
  3C ITS AI PC Health Checker & NPU Performance - Windows installer.

.EXAMPLE
  # Install for this computer, local access only (normal PowerShell window is enough)
  powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1

.EXAMPLE
  # Start automatically at boot and allow a portal (hub) on the LAN to connect (run PowerShell as Administrator)
  powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Service -Network

.EXAMPLE
  # Air-gapped install from a folder of downloaded wheels
  powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Offline D:\wheels
#>
[CmdletBinding()]
param(
  [switch]$Service,          # run at startup as a scheduled task (needs Administrator)
  [switch]$Network,          # listen on the LAN (0.0.0.0) + firewall rule (needs Administrator)
  [string]$Token = "",       # machine token for portal access (generated if empty)
  [int]$Port = 8765,
  [string]$Offline = "",     # folder with wheels for offline installs
  [string]$Python = ""       # explicit python.exe
)
$ErrorActionPreference = "Stop"
$AppDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$TaskName = "3C ITS AI PC Health Checker"
$RuleName = "3C ITS AI PC Health Checker"

function Say($m)  { Write-Host "`n==> $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "[FAIL] $m" -ForegroundColor Red; exit 1 }
function IsAdmin  { ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }

Say "3C ITS AI PC Health Checker - installing into $AppDir"
if (-not (Test-Path (Join-Path $AppDir "run.py"))) { Die "run.py not found in $AppDir" }
if (($Service -or $Network) -and -not (IsAdmin)) { Die "-Service and -Network need an Administrator PowerShell (right-click > Run as administrator)." }

# --- 1. Python ------------------------------------------------------------------------------
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name.Trim()
$isArm = $env:PROCESSOR_ARCHITECTURE -eq "ARM64" -or $cpu -match "Snapdragon|Oryon"
if (-not $Python) {
  $cands = @()
  if (Get-Command py -ErrorAction SilentlyContinue) {
    foreach ($v in "3.12", "3.11", "3.13") {
      $p = (& py "-$v" -c "import sys;print(sys.executable)" 2>$null)
      if ($LASTEXITCODE -eq 0 -and $p) { $cands += $p.Trim() }
    }
  }
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -notmatch "WindowsApps") { $cands += $cmd.Source }
  if ($cands.Count -eq 0) {
    Die "Python 3.12 (64-bit$(if ($isArm) {', ARM64'})) not found. Install it from https://www.python.org/downloads/windows/ and tick 'Add python.exe to PATH', then run this again."
  }
  $Python = $cands[0]
}
$info = (& $Python -c "import sys,struct,platform;print(sys.version_info[0],sys.version_info[1],struct.calcsize('P')*8,platform.machine())").Split(" ")
$pyMajor = [int]$info[0]; $pyMinor = [int]$info[1]; $pyBits = $info[2]; $pyArch = $info[3]
Say "Using $Python (Python $pyMajor.$pyMinor, $pyBits-bit, $pyArch) on $cpu"
if ($pyBits -ne "64") { Die "64-bit Python is required." }
if ($pyMajor -ne 3 -or $pyMinor -lt 10) { Die "Python 3.10+ is required (3.12 recommended)." }
if ($isArm -and $pyArch -ne "ARM64") { Die "This is a Snapdragon (ARM64) PC: install the ARM64 build of Python 3.12, otherwise the NPU cannot be used." }

# --- 2. virtual environment + packages ------------------------------------------------------------
# AMD Ryzen AI: the NPU-enabled onnxruntime (Vitis AI EP) lives in AMD's Ryzen AI Python environment.
# Reuse its packages (--system-site-packages) and do not install the plain onnxruntime over it.
$isRyzenAI = $cpu -match "Ryzen AI|Ryzen [3579] (PRO )?[78]\d40"
$amdEnv = $isRyzenAI -and ((& $Python -c "import onnxruntime as o;print('VitisAIExecutionProvider' in o.get_available_providers())" 2>$null) -eq "True")
$Venv = Join-Path $AppDir ".venv"
$Py = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path $Py)) {
  Say "Creating virtual environment $Venv"
  if ($amdEnv) { & $Python -m venv --system-site-packages $Venv } else { & $Python -m venv $Venv }
  if ($LASTEXITCODE) { Die "venv creation failed" }
}
Say "Installing Python packages (this takes a few minutes the first time)"
$pipArgs = @("-m", "pip", "install", "--disable-pip-version-check")
if ($Offline) { $pipArgs += @("--no-index", "--find-links", $Offline) }
& $Py @pipArgs --upgrade pip | Out-Null
$req = Join-Path $AppDir "requirements.txt"
if ($amdEnv) {
  Say "AMD Ryzen AI environment detected: keeping AMD's NPU-enabled onnxruntime"
  $req = Join-Path $env:TEMP "3cits-requirements-amd.txt"
  Get-Content (Join-Path $AppDir "requirements.txt") | Where-Object { $_ -notmatch "^\s*onnxruntime" } | Set-Content $req
}
& $Py @pipArgs -r $req
if ($LASTEXITCODE) { Die "Package installation failed (see messages above). For offline sites use -Offline <wheel folder>." }

# --- 3. NPU runtime for this processor ------------------------------------------------------------
if ($cpu -match "Snapdragon|Oryon") {
  Say "Snapdragon PC: installing the Qualcomm NPU runtime (onnxruntime-qnn)"
  & $Py -m pip uninstall -y onnxruntime | Out-Null
  & $Py @pipArgs onnxruntime-qnn
} elseif ($isRyzenAI -and -not $amdEnv) {
  Warn "AMD Ryzen AI PC: for NPU inference install the AMD NPU driver and 'Ryzen AI Software', then re-run with -Python <python.exe of the ryzen-ai environment> (delete the .venv folder first). Monitoring works without it."
} elseif ($amdEnv) {
  Say "AMD Ryzen AI NPU runtime (Vitis AI) available"
} elseif ($cpu -match "Core\(TM\) Ultra") {
  $npu = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match "AI Boost|NPU" }
  if ($npu) { Say "Intel NPU found: $($npu[0].FriendlyName) (status $($npu[0].Status))" }
  else { Warn "Intel Core Ultra without a working NPU driver. Install 'Intel NPU Driver' (Intel AI Boost) from Windows Update or intel.com and reboot." }
} else {
  Warn "No NPU expected on '$cpu'. The app will run and report this machine as 'Not an AI PC'."
}

# --- 4. folders, prerequisite check ---------------------------------------------------------------
foreach ($d in "data", "reports", "models") { New-Item -ItemType Directory -Force -Path (Join-Path $AppDir $d) | Out-Null }
Say "Checking prerequisites"
& $Py (Join-Path $AppDir "tools\check_prereqs.py") --port $Port

# --- 5. network access, token, firewall -------------------------------------------------------------
$HostAddr = "127.0.0.1"
$TokenFile = Join-Path $AppDir "data\machine_token.txt"
if ($Network) {
  $HostAddr = "0.0.0.0"
  if (-not $Token) { $Token = & $Py -c "import secrets;print(secrets.token_urlsafe(16))" }
  Set-Content -Path $TokenFile -Value $Token -NoNewline -Encoding ascii
  # only Administrators and SYSTEM may read the token
  & icacls $TokenFile /inheritance:r /grant:r "*S-1-5-32-544:(R,W)" "*S-1-5-18:(R)" | Out-Null
  if (-not (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Domain,Private | Out-Null
    Say "Firewall rule added for TCP $Port (Domain and Private networks only)"
  }
}

# --- 6. start menu / desktop shortcut and start script ------------------------------------------------
$startBat = Join-Path $AppDir "start.bat"
$runArgs = "--host $HostAddr --port $Port" + $(if ($Network) { " --token-file `"$TokenFile`"" } else { "" })
Set-Content -Path $startBat -Encoding ascii -Value "@echo off`r`ncd /d `"%~dp0`"`r`n`"$Py`" run.py $runArgs`r`npause"
$url = "http://localhost:$Port/"
$desktop = [Environment]::GetFolderPath("Desktop")
Set-Content -Path (Join-Path $desktop "3C ITS AI PC Health Checker.url") -Value "[InternetShortcut]`r`nURL=$url`r`nIconFile=$AppDir\npu_monitor\static\favicon.png`r`n"

# --- 7. optional startup task -----------------------------------------------------------------------
if ($Service) {
  Say "Registering startup task '$TaskName' (runs as SYSTEM, restarts on failure)"
  $action = New-ScheduledTaskAction -Execute $Py -Argument "run.py --no-browser $runArgs" -WorkingDirectory $AppDir
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
              -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 6
}

Say "Installed."
Write-Host "  Open:          $url   (create the administrator account on first visit - desktop shortcut added)"
if ($Service) { Write-Host "  Startup task:  '$TaskName' (Task Scheduler). Stop/start: Stop-ScheduledTask / Start-ScheduledTask -TaskName '$TaskName'" }
else { Write-Host "  Start:         double-click $startBat" }
if ($Network) {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch "^(127|169\.254)\." } | Select-Object -First 1).IPAddress
  Write-Host "  Portal access: http://$($ip):$Port   machine token: $Token  (stored in $TokenFile)"
}
if (-not $Service) { Start-Process $startBat; Start-Sleep -Seconds 4; Start-Process $url }
