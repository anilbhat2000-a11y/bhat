@echo off
rem 3C ITS VisionOps - double-click to stop.
cd /d "%~dp0"
set "PY="
python -c "import sys" >nul 2>nul && set "PY=python"
if not defined PY py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY set "PY=python"
%PY% -m sentinel.launcher --stop
timeout /t 3 >nul
