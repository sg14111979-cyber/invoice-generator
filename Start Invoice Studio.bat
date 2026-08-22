@echo off
REM Windows: double-click this file to start Invoice Studio.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org, then double-click this file again.
  pause
  exit /b 1
)

node scripts\start.mjs
echo.
echo Invoice Studio stopped.
pause
