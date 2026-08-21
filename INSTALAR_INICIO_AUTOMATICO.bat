@echo off
setlocal EnableExtensions
cd /d "%~dp0"
color 0B
chcp 65001 >nul

title MARMORARIA IMPERIAL - INSTALADOR DE INICIO AUTOMATICO

echo ============================================================
echo   MARMORARIA IMPERIAL - INICIO AUTOMATICO DO WHATSAPP BOT
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado no PATH.
    echo Instale Node.js 20+ antes de continuar.
    pause
    exit /b 1
)

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\Marmoraria-WhatsApp-Bot.bat"

>"%TARGET%" echo @echo off
>>"%TARGET%" echo cd /d "%~dp0"
>>"%TARGET%" echo start "Marmoraria WhatsApp Bot" /min cmd /c "cd /d \"%~dp0\" ^&^& npm run start:bot"

rem Corrige o caminho para apontar para a pasta atual do projeto.
>"%TARGET%" echo @echo off
>>"%TARGET%" echo cd /d "%~dp0"
>>"%TARGET%" echo start "Marmoraria WhatsApp Bot" /min cmd /c "cd /d \"%CD%\" ^&^& npm run start:bot"

if exist "%TARGET%" (
    echo.
    echo [OK] Inicio automatico instalado.
    echo.
    echo Arquivo criado em:
    echo %TARGET%
    echo.
    echo O bot sera iniciado automaticamente quando voce entrar no Windows.
    echo.
    echo Para remover, execute:
    echo DESINSTALAR_INICIO_AUTOMATICO.bat
) else (
    echo [ERRO] Nao foi possivel criar o atalho de inicializacao.
)

pause
endlocal
