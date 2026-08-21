@echo off
setlocal EnableExtensions
cd /d "%~dp0"
color 0A
chcp 65001 >nul

title MARMORARIA IMPERIAL - WHATSAPP BOT

echo ============================================================
echo        MARMORARIA IMPERIAL - WHATSAPP BOT
echo ============================================================
echo.

echo [1/4] Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 goto :node_error
node --version
npm --version

echo.
echo [2/4] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias pela primeira vez...
    call npm install
    if errorlevel 1 goto :npm_error
) else (
    echo node_modules encontrado. Pulando npm install.
)

echo.
echo [3/4] Iniciando Marmoraria + WhatsApp...
echo.
echo Painel: http://localhost:3000
 echo API:    http://localhost:3000/api/bot/status
 echo.
echo NAO FECHE ESTA JANELA enquanto o bot estiver em uso.
echo.

call npm run start:bot
if errorlevel 1 goto :bot_error

goto :end

:node_error
echo.
echo [ERRO] Node.js nao foi encontrado no PATH.
echo Instale Node.js 20 ou superior e abra este arquivo novamente.
pause
goto :end

:npm_error
echo.
echo [ERRO] Nao foi possivel instalar as dependencias.
echo Verifique sua internet e tente novamente.
pause
goto :end

:bot_error
echo.
echo [ERRO] O servidor do chatbot foi encerrado.
echo Verifique a mensagem acima para identificar a causa.
pause
goto :end

:end
endlocal
