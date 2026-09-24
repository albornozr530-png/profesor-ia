@echo off
setlocal
cd /d "%~dp0"
title Profesor IA - Web y PWA
if not exist "node_modules" (
  echo Instalando dependencias...
  call npm.cmd install
  call npm.cmd --prefix server install
  call npm.cmd --prefix client install
)
echo Iniciando servidor...
start "Profesor IA API" /min /D "%~dp0server" npm.cmd start
timeout /t 2 /nobreak >nul
echo Iniciando cliente web...
start "Profesor IA Web" /D "%~dp0client" npm.cmd run dev -- --host 0.0.0.0
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"
echo Profesor IA esta listo. No cierres las ventanas de servidor y cliente.
endlocal
