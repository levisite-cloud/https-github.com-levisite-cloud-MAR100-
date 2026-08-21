@echo off
title Marmoraria Imperial
color 0A

cd /d "%~dp0"

echo ========================================
echo   MARMORARIA IMPERIAL - INICIANDO...
echo ========================================
echo.

:: Verificar node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Instale Node.js: https://nodejs.org
    pause
    exit /b 1
)

:: Instalar dependencias se necessário
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
    echo.
)

echo [OK] Iniciando servidor...
echo [INFO] Acesse: http://localhost:3000
echo.

call npm run dev

pause