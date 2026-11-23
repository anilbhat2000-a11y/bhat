@echo off
rem 3C ITS VisionOps - writes logs\diagnose.txt for support.
title 3C ITS VisionOps diagnostics
cd /d "%~dp0"
set "PY="
python -c "import sys" >nul 2>nul && set "PY=python"
if not defined PY py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY (
  echo Python was not found. Install Python 3.13 from python.org and tick "Add python.exe to PATH".
  pause
  exit /b 1
)
%PY% -m sentinel.launcher --diagnose
echo.
pause
