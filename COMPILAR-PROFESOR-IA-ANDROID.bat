@echo off
setlocal
cd /d "%~dp0"
title Sincronizando Profesor IA para Android
if not exist "node_modules" call npm.cmd install
if not exist "client\node_modules" call npm.cmd --prefix client install
call npm.cmd run android:sync
if errorlevel 1 (
  echo No se pudo sincronizar Android. Revisa que Node.js este instalado.
  pause
  exit /b 1
)
echo Proyecto Android sincronizado. Usa "npm run android:open" con Android Studio.
pause
endlocal
