@echo off
setlocal
cd /d "%~dp0"
title Compilando Profesor IA para Windows
if not exist "node_modules" call npm.cmd install
if not exist "server\node_modules" call npm.cmd --prefix server install
if not exist "client\node_modules" call npm.cmd --prefix client install
call npm.cmd run build:win
if errorlevel 1 (
  echo No se pudo crear el instalador. Revisa el log de electron-builder.
  pause
  exit /b 1
)
echo Listo. Los archivos estan en la carpeta release.
pause
endlocal
