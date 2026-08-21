@echo off
title PM2 - Marmoraria Imperial
color 0E

cd /d "%~dp0"

echo ========================================
echo   GERENCIADOR DE PROCESSOS - PM2
echo ========================================
echo.

:: Verificar se PM2 esta instalado
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Instalando PM2 globalmente...
    call npm install -g pm2
    echo.
)

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

echo ========================================
echo   OPCOES:
echo ========================================
echo.
echo   1. Iniciar servidor
echo   2. Parar servidor
echo   3. Reiniciar servidor
echo   4. Ver logs
echo   5. Ver status
echo   6. Sair
echo.
set /p opcao="Escolha uma opcao (1-6): "

if "%opcao%"=="1" goto :iniciar
if "%opcao%"=="2" goto :parar
if "%opcao%"=="3" goto :reiniciar
if "%opcao%"=="4" goto :logs
if "%opcao%"=="5" goto :status
if "%opcao%"=="6" goto :sair

echo [ERRO] Opcao invalida!
pause
goto :0

:iniciar
echo.
echo [INFO] Iniciando servidor com PM2...
call pm2 start "npx tsx server.ts" --name marmoraria
echo.
echo [OK] Servidor iniciado!
echo [INFO] Acesse: http://localhost:3000
echo [INFO] Logs: pm2 logs marmoraria
echo.
pause
goto :0

:parar
echo.
echo [INFO] Parando servidor...
call pm2 stop marmoraria
echo [OK] Servidor parado!
pause
goto :0

:reiniciar
echo.
echo [INFO] Reiniciando servidor...
call pm2 restart marmoraria
echo [OK] Servidor reiniciado!
pause
goto :0

:logs
echo.
echo [INFO] Mostrando logs (CTRL+C para sair)...
call pm2 logs marmoraria
goto :0

:status
echo.
call pm2 status
echo.
pause
goto :0

:sair
exit /b 0