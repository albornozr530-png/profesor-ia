@echo off
title Profesor IA - Servidor
echo ============================================
echo    PROFESOR IA - Iniciando...
echo ============================================

cd /d "%~dp0"

:: Verificar que el backend no este ya corriendo
powershell -Command "try { Invoke-RestMethod -Uri 'http://localhost:3001/api/levels' | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [1/3] Iniciando backend...
    start "" /min node "server\src\index.js"
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Backend ya estaba corriendo.
)

:: Verificar que el frontend no este ya corriendo
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [2/3] Iniciando frontend...
    start "" /min cmd /c "cd client && npm run dev > ..\client-dev.log 2>&1"
    timeout /t 8 /nobreak >nul
) else (
    echo [2/3] Frontend ya estaba corriendo.
)

echo [3/3] Abriendo Profesor IA en Opera GX...
set "OPERA=%LOCALAPPDATA%\Programs\Opera GX\opera.exe"
if not exist "%OPERA%" set "OPERA=%LOCALAPPDATA%\Programs\Opera\opera.exe"
start "" "%OPERA%" --new-window --start-maximized "http://localhost:5173"

echo.
echo Listo! La ventana de Profesor IA deberia estar abierta.
echo (Puedes cerrar esta consola si quieres)
timeout /t 5
