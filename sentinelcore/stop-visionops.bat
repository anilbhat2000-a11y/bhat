@echo off
rem 3C ITS VisionOps - double-click to stop.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  py -3 -m sentinel.launcher --stop
) else (
  python -m sentinel.launcher --stop
)
timeout /t 3 >nul
