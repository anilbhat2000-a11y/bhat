@echo off
rem 3C ITS VisionOps - double-click to start. Opens the portal in your browser.
rem This window always stays open, so you can read what happened.
title 3C ITS VisionOps
cd /d "%~dp0"
echo 3C ITS VisionOps launcher (v0.4.3)
echo Folder: %CD%
echo.
set "PY="
python -c "import sys" >nul 2>nul && set "PY=python"
if not defined PY py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY (
  echo Python was not found. Install Python 3.13 from python.org and tick "Add python.exe to PATH".
  goto end
)
if not exist "sentinel\launcher.py" (
  echo This folder does not contain the VisionOps launcher. Run "git pull" in this folder first.
  goto end
)
%PY% -m sentinel.launcher %*
echo.
echo ---------------------------------------------------------------
echo The launcher has finished. If VisionOps did not open, run
echo diagnose-visionops.bat and send logs\diagnose.txt to support.
:end
echo.
pause
