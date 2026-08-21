@echo off
title WhatsApp Bot - Marmoraria Imperial
color 0B

cd /d "%~dp0"

echo ========================================
echo   WHATSAPP BOT - MARMORARIA IMPERIAL
echo ========================================
echo.
echo [INFO] Bot WhatsApp iniciando...
echo [INFO] Mantenha esta janela aberta!
echo.

:: Verificar node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    pause
    exit /b 1
)

:: Instalar dependencias se necessário
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
    echo.
)

:: Criar pasta de sessao
if not exist "whatsapp-session" mkdir whatsapp-session

echo [OK] Bot iniciado com sucesso!
echo [INFO] QR Code aparecera no navegador
echo [INFO] Escaneie com o WhatsApp
echo.
echo ========================================
echo   BOT RODANDO - NAO FECHE ESTA JANELA
echo ========================================
echo.

call npx tsx server.ts

pause