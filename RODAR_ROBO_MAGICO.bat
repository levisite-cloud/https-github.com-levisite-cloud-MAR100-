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
echo  TUDO PRONTO! INICIANDO O SISTEMA...
echo ========================================
echo.

:: Abre o navegador no endereco correto (porta 3000)
start http://localhost:3000

:: Inicia o servidor unificado (que contem o Frontend, Backend e Robo do WhatsApp)
echo O servidor do Robo, Interface e Banco de Dados rodarao juntos nesta tela.
echo Aguarde o QR Code aparecer logo abaixo...
echo.
npm run dev

pause
