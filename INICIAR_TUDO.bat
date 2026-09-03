@echo off
setlocal
title MARMORARIA IMPERIAL - SISTEMA COMPLETO

:: Garante que o Node.js e o NPM estejam no PATH
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\samsung\AppData\Local\hermes\node;%APPDATA%\npm"

cls
echo ================================================================
echo           MARMORARIA IMPERIAL - INICIANDO SISTEMA
echo ================================================================
echo.
echo  Processos incluidos:
echo   - Servidor Web (Frontend e Backend na porta 3000)
echo   - Modulo de Geracao de Orcamento e Agendamento em PDF
echo   - Robo de WhatsApp Web (com leitor de QR Code)
echo.
echo ================================================================
echo.

:: 1. Liberar porta 3000 se estiver travada
echo [1/4] Liberando porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Porta 3000 pronta.
echo.

:: 2. Verificar arquivo .env
echo [2/4] Verificando configuracao .env...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Arquivo .env criado a partir de .env.example.
    )
) else (
    echo [OK] Arquivo .env verificado.
)
echo.

:: 3. Verificar dependencias
echo [3/4] Verificando dependencias...
if not exist "node_modules\" (
    echo [INFO] Instalando modulos do sistema...
    call npm install
) else (
    echo [OK] Dependencias prontas.
)
echo.

:: 4. Abrir navegador automaticamente
echo [4/4] Agendando abertura do navegador...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo.
echo ================================================================
echo   SISTEMA INICIADO COM SUCESSO!
echo ================================================================
echo.
echo   Painel Web:   http://localhost:3000
echo   WhatsApp API: http://localhost:3000/api/bot/status
echo.
echo   Para conectar o WhatsApp: clique no botao no topo da tela.
echo   Para ENCERRAR o sistema: feche esta janela ou pressione CTRL+C.
echo ================================================================
echo.

:: Inicia o servidor unificado
call npm run dev

echo.
echo [SISTEMA ENCERRADO]
pause
