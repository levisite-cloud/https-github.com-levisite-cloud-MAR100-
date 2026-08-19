@echo off
title MAR100 - Sistema Completo
color 0A
cls

echo.
echo =============================================
echo   MAR100 - MARMORARIA - SISTEMA COMPLETO
echo =============================================
echo.

REM 1. Verificar Node.js
echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] Node.js nao encontrado!
    echo Baixe em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo   Node.js: %%v

REM 2. Verificar dependencias
echo.
echo [2/5] Verificando dependencias...
if not exist "node_modules" (
    echo   Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
) else (
    echo   Dependencias OK
)

REM 3. Verificar se ja existem processos rodando
echo.
echo [3/5] Verificando processos existentes...
tasklist /fi "WINDOWTITLE eq MAR100-Backend" 2>nul | find /i "node" >nul
if not errorlevel 1 (
    echo   [AVISO] Backend ja esta rodando. Pulando...
    set BACKEND_RUNNING=1
)
tasklist /fi "WINDOWTITLE eq MAR100-Bot" 2>nul | find /i "node" >nul
if not errorlevel 1 (
    echo   [AVISO] Bot ja esta rodando. Pulando...
    set BOT_RUNNING=1
)

REM 4. Iniciar Backend (Frontend + Server)
if not defined BACKEND_RUNNING (
    echo.
    echo [4/5] Iniciando Backend (porta 3000)...
    start "MAR100-Backend" cmd /c "cd /d "%~dp0" && npm run dev"
    echo   Backend iniciado!
) else (
    echo [4/5] Backend ja ativo.
)

REM 5. Iniciar Bot WhatsApp
if not defined BOT_RUNNING (
    echo.
    echo [5/5] Iniciando Bot WhatsApp (porta 3001)...
    start "MAR100-Bot" cmd /c "cd /d "%~dp0" && npm run bot"
    echo   Bot WhatsApp iniciado!
) else (
    echo [5/5] Bot ja ativo.
)

echo.
echo =============================================
echo   SISTEMA MAR100 INICIADO COM SUCESSO!
echo =============================================
echo.
echo   Frontend:  http://localhost:3000
echo   Bot API:   http://localhost:3001/api/bot/status
echo.
echo   Para parar: feche as janelas do terminal
echo              ou pressione Ctrl+C em cada uma.
echo.

REM Aguardar um pouco e mostrar status
echo Aguardando inicializacao (10s)...
timeout /t 10 /nobreak >nul

REM Verificar status
echo.
echo Verificando status...
curl -s http://localhost:3001/api/bot/status >nul 2>&1
if not errorlevel 1 (
    echo.
    echo   Bot WhatsApp: ONLINE
) else (
    echo.
    echo   Bot WhatsApp: Iniciando (aguarde mais alguns segundos)
)

echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
