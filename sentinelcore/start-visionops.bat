@echo off
rem 3C ITS VisionOps - double-click to start. Opens the portal in your browser.
title 3C ITS VisionOps
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  py -3 -m sentinel.launcher %*
) else (
  python -m sentinel.launcher %*
)
if errorlevel 1 (
  echo.
  echo VisionOps could not start. Read the message above, or send logs\server-output.log to support.
  pause
)
