@echo off
rem 3C ITS VisionOps - double-click to start. Opens the portal in your browser.
title 3C ITS VisionOps
cd /d "%~dp0"
set "PY="
python -c "import sys" >nul 2>nul && set "PY=python"
if not defined PY py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY (
  echo Python was not found. Install Python 3.13 from python.org and tick "Add python.exe to PATH".
  pause
  exit /b 1
)
%PY% -m sentinel.launcher %*
if errorlevel 1 (
  echo.
  echo VisionOps could not start. Read the message above, or send the logs folder
  echo ^(launcher.log and server-output.log^) to support.
  pause
)
