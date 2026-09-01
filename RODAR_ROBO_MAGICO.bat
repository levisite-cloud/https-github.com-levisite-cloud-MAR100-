@echo off
setlocal
chcp 65001 >nul
title MARMORARIA - SISTEMA COMPLETO

echo ========================================
echo       SISTEMA MARMORARIA - AUTOSTART
echo ========================================
echo.

echo [1/4] Limpando processos antigos (evita erro de porta)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM tsx.cmd >nul 2>&1
echo [OK] Processos antigos encerrados.
echo.

echo [2/4] Sincronizando com o GitHub...
git pull
echo.

echo [3/4] Verificando dependencias...
call npm install >nul 2>&1
echo [OK] Dependencias instaladas.
echo.

echo [4/4] Iniciando os servidores...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
    )
)

echo.
echo ========================================
echo  TUDO PRONTO! INICIANDO AS JANELAS...
echo ========================================
echo.

:: Inicia o Frontend em uma nova janela
start "Frontend (Interface do Sistema)" cmd /k "npm run dev -- --port 5173"

:: Inicia o Backend/Chatbot nesta mesma janela para ver o QR Code direto aqui
echo O servidor do Robo e Banco de Dados ficara nesta tela.
echo Aguarde o QR Code...
echo.
npm run start:local

pause
