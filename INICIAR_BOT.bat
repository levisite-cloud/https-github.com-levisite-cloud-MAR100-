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
echo [1/6] Verificando Node.js...
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
echo [2/6] Verificando dependencias...
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

REM 3. Matar processos antigos nas portas 3000 e 3001
echo.
echo [3/6] Limpando portas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Matando processo na porta 3000 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    echo   Matando processo na porta 3001 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)
echo   Portas limpas!

REM 4. Iniciar Backend (Frontend + Server na porta 3000)
echo.
echo [4/6] Iniciando Backend (porta 3000)...
start "MAR100-Backend" cmd /k "cd /d "%~dp0" && title MAR100-Backend && npm run dev"
echo   Backend iniciado!

REM 5. Iniciar Bot WhatsApp (porta 3001)
echo.
echo [5/6] Iniciando Bot WhatsApp (porta 3001)...
start "MAR100-Bot" cmd /k "cd /d "%~dp0" && title MAR100-Bot && npm run bot"
echo   Bot iniciado!

REM 6. Iniciar Sync GitHub
echo.
echo [6/6] Iniciando Sync GitHub...
start "MAR100-Sync" cmd /k "cd /d "%~dp0" && title MAR100-Sync && npm run sync"
echo   Sync iniciado!

echo.
echo =============================================
echo   SISTEMA MAR100 INICIADO COM SUCESSO!
echo =============================================
echo.
echo   Frontend:  http://localhost:3000
echo   Bot API:   http://localhost:3001/api/bot/status
echo   Bot Health: http://localhost:3001/api/bot/health
echo   Sync:      Rodando a cada 30s
echo.
echo   3 terminais abertos:
echo     - MAR100-Backend
echo     - MAR100-Bot
echo     - MAR100-Sync
echo.
echo   Para PARAR: feche as 3 janelas do terminal
echo.

REM Aguardar e mostrar status
echo Aguardando inicializacao (15s)...
timeout /t 15 /nobreak >nul

echo.
echo Verificando status dos servicos...
echo.

REM Verificar Backend
curl -s http://localhost:3000 >nul 2>&1
if not errorlevel 1 (
    echo   [OK] Backend:     ONLINE  - http://localhost:3000
) else (
    echo   [..] Backend:     Aguarde...
)

REM Verificar Bot
curl -s http://localhost:3001/api/bot/status >nul 2>&1
if not errorlevel 1 (
    echo   [OK] Bot:         ONLINE  - http://localhost:3001
) else (
    echo   [..] Bot:         Aguarde...
)

REM Verificar Sync
tasklist /fi "WINDOWTITLE eq MAR100-Sync" 2>nul | find /i "cmd" >nul
if not errorlevel 1 (
    echo   [OK] Sync:        ATIVO
) else (
    echo   [..] Sync:        Verificando...
)

echo.
echo =============================================
echo   Pronto! Acesse http://localhost:3000
echo =============================================
echo.
pause
