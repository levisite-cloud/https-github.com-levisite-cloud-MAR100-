@echo off
title Marmoraria Imperial - WhatsApp Bot & Server
color 0A

echo ========================================
echo   MARMORARIA IMPERIAL - SISTEMA COMPLETO
echo ========================================
echo.
echo Iniciando servidor...
echo.

cd /d "%~dp0"

:: Verificar se node esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale em: https://nodejs.org
    pause
    exit /b 1
)

:: Verificar se as dependencias estao instaladas
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
)

:: Iniciar o servidor
echo [OK] Iniciando servidor na porta 3000...
echo [INFO] Acesse: http://localhost:3000
echo [INFO] WhatsApp Bot: http://localhost:3000/api/bot/status
echo.
echo ========================================
echo   SERVIDOR RODANDO - NAO FECHE ESTA JANELA
echo   Pressione CTRL+C para parar
echo ========================================
echo.

call npx tsx server.ts

pause