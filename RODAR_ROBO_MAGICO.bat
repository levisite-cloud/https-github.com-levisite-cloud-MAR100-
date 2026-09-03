@echo off
setlocal
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\samsung\AppData\Local\hermes\node;%APPDATA%\npm"
title MARMORARIA IMPERIAL - SUPER ROBO

echo.
echo ================================================================
echo       MARMORARIA IMPERIAL - SISTEMA COMPLETO
echo ================================================================
echo.

:: PASSO 1 - Limpar portas travadas
echo [1/5] Liberando portas (3000 e 24678)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":24678 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Portas liberadas.
echo.

:: PASSO 2 - Sincronizar com GitHub
echo [2/5] Sincronizando com o GitHub...
git pull
echo.

:: PASSO 3 - Dependencias
echo [3/5] Verificando dependencias...
if not exist "node_modules\" (
    echo Primeira instalacao detectada. Aguarde...
    call npm install
) else (
    call npm install --silent >nul 2>&1
)
echo [OK] Dependencias prontas.
echo.

:: PASSO 4 - Arquivo .env
echo [4/5] Verificando configuracoes (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [AVISO] Arquivo .env criado. Edite com suas credenciais!
    ) else (
        echo [AVISO] Arquivo .env nao encontrado!
    )
) else (
    echo [OK] Arquivo .env encontrado.
)
echo.

:: PASSO 5 - Iniciar o sistema
echo [5/5] Iniciando o Sistema...
echo.
echo ================================================================
echo  SISTEMA INICIADO! Abrindo o navegador...
echo ================================================================
echo.
echo  - Acesse: http://localhost:3000
echo  - Para conectar o WhatsApp, va em: Configuracoes
echo  - O QR Code aparecera nesta tela E no sistema
echo.
echo  Para ENCERRAR: feche esta janela ou pressione CTRL+C
echo ================================================================
echo.

:: Agenda abertura do navegador apos o servidor iniciar
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Roda o servidor unificado (Frontend + Backend + Robo na mesma porta 3000)
npm run dev

echo.
echo [SERVIDOR ENCERRADO]
pause
