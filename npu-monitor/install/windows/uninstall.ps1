<#
.SYNOPSIS
  Removes the startup task, firewall rule and shortcut created by install.ps1.
  Keeps users, reports and battery history unless -RemoveData is given.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1 [-RemoveData]
#>
param([switch]$RemoveData)
$AppDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Name = "3C ITS AI PC Health Checker"
if (Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $Name -Confirm:$false
  Write-Host "Removed startup task."
}
if (Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue) {
  Remove-NetFirewallRule -DisplayName $Name; Write-Host "Removed firewall rule."
}
$lnk = Join-Path ([Environment]::GetFolderPath("Desktop")) "$Name.url"
if (Test-Path $lnk) { Remove-Item $lnk; Write-Host "Removed desktop shortcut." }
foreach ($p in ".venv", "start.bat") { $f = Join-Path $AppDir $p; if (Test-Path $f) { Remove-Item -Recurse -Force $f } }
if ($RemoveData) {
  foreach ($p in "data", "reports") { $f = Join-Path $AppDir $p; if (Test-Path $f) { Remove-Item -Recurse -Force $f } }
  Write-Host "Removed data and reports."
} else { Write-Host "Kept $AppDir\data and $AppDir\reports (delete the folder to remove everything)." }
