@echo off
setlocal
title MARMORARIA IMPERIAL - PARAR TODOS OS SERVICOS

cls
echo ================================================================
echo           MARMORARIA IMPERIAL - PARAR SERVICOS
echo ================================================================
echo.
echo  Encerrando todos os processos do sistema...
echo.

:: 1. Finalizar processos que estao escutando na porta 3000
echo [1/3] Finalizando processos na porta 3000...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " 2^>nul') do (
    set FOUND=1
    taskkill /F /PID %%a >nul 2>&1
)
if "%FOUND%"=="1" (
    echo [OK] Processos na porta 3000 finalizados.
) else (
    echo [INFO] Nenhum processo rodando na porta 3000.
)
echo.

:: 2. Finalizar processos do Node.js associados ao projeto
echo [2/3] Finalizando processos Node.js e tsx...
taskkill /F /IM tsx.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq MARMORARIA IMPERIAL*" >nul 2>&1
echo [OK] Instancias do servidor encerradas.
echo.

:: 3. Fechar processos orfaos do Chromium / Puppeteer do WhatsApp
echo [3/3] Liberando navegador do WhatsApp Web...
for /f "tokens=2" %%i in ('wmic process where "name='chrome.exe' and CommandLine like '%%wwebjs%%'" get ProcessId 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /F /PID %%i >nul 2>&1
)
echo [OK] Navegadores e robo liberados.
echo.

echo ================================================================
echo   TODOS OS SERVICOS FORAM ENCERRADOS COM SUCESSO!
echo ================================================================
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
