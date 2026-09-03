@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title MARMORARIA IMPERIAL - INICIANDO TODOS OS PROCESSOS

cls
echo ===============================================================================
echo                🏛️  MARMORARIA IMPERIAL - SISTEMA INTEGRADO
echo ===============================================================================
echo.
echo  Iniciando todos os processos do sistema:
echo    [+] Servidor Web Fullstack (Express + Vite)
echo    [+] Modulo de Agendamento e Orcamentos em PDF
echo    [+] Robo WhatsApp Web com leitura de QR Code
echo    [+] Sincronizacao em Nuvem com Supabase
echo.
echo ===============================================================================
echo.

:: 1. Verificar se Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO CRITICO] O Node.js nao foi encontrado no sistema!
    echo Instale o Node.js em: https://nodejs.org
    pause
    exit /b 1
)

:: 2. Liberar portas que possam estar ocupadas (3000)
echo [*] [1/4] Verificando e liberando porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Porta 3000 pronta e liberada.
echo.

:: 3. Verificar arquivo de configuracao .env
echo [*] [2/4] Verificando arquivo de configuracao (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Arquivo .env gerado a partir do modelo .env.example.
    ) else (
        echo [AVISO] Arquivo .env nao encontrado. Usando configuracoes padrao.
    )
) else (
    echo [OK] Arquivo .env validado.
)
echo.

:: 4. Verificar dependencias do projeto
echo [*] [3/4] Verificando modulos e dependencias...
if not exist "node_modules\" (
    echo [INFO] Primeira execucao detectada. Instalando pacotes necessarios...
    call npm install
) else (
    echo [OK] Dependencias instaladas.
)
echo.

:: 5. Agendar abertura automatica do navegador assim que o servidor subir
echo [*] [4/4] Agendando abertura automatica no navegador...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo.
echo ===============================================================================
echo  🟢 TODOS OS PROCESSOS INICIADOS COM SUCESSO!
echo ===============================================================================
echo.
echo   - Painel do Sistema: http://localhost:3000
echo   - WhatsApp API:     http://localhost:3000/api/bot/status
echo.
echo   * Para conectar o WhatsApp, use o botao no topo do sistema ou escaneie
echo     o QR Code que aparecera na tela.
echo.
echo   Pressione CTRL + C para encerrar os processos quando desejar.
echo ===============================================================================
echo.

:: Inicia o processo principal
call npm run dev

echo.
echo [SISTEMA FINALIZADO]
pause
