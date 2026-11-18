@echo off
title Kinetic 3D Video Studio - GPU Render
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist node_modules\mp4-muxer (
  echo Installing dependencies - first run only, this takes a minute...
  call npm install
  if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )
)

echo Starting the studio server on http://localhost:3000 ...
start "Kinetic Studio Server - keep open while rendering" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if not defined BROWSER (
  echo Chrome/Edge not found - open http://localhost:3000 in your browser manually.
  start "" http://localhost:3000
  pause
  exit /b 0
)

rem Separate profile so the GPU flags apply even if Chrome is already open
"%BROWSER%" --user-data-dir="%TEMP%\kinetic-gpu-browser" --new-window --start-maximized ^
  --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy ^
  --force_high_performance_gpu --autoplay-policy=no-user-gesture-required ^
  http://localhost:3000
