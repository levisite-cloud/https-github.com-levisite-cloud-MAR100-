@echo off
setlocal EnableExtensions
color 0C
chcp 65001 >nul

title MARMORARIA IMPERIAL - REMOVER INICIO AUTOMATICO
set "TARGET=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Marmoraria-WhatsApp-Bot.bat"

if exist "%TARGET%" (
    del /f /q "%TARGET%"
    echo [OK] Inicio automatico removido.
) else (
    echo [INFO] O inicio automatico nao estava instalado.
)

pause
endlocal
