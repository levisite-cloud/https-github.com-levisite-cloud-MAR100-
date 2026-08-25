@echo off
setlocal EnableExtensions EnableDelayedExpansion
color 0A
chcp 65001 >nul
cd /d "%~dp0"

title MARMORARIA IMPERIAL - PAINEL COMPLETO

:inicio
cls
echo ========================================
echo   MARMORARIA IMPERIAL ARTE EM PEDRAS
echo   Painel Completo de Instalacao e Gestao
echo ========================================
echo.

:: ----------------------------------------
:: 1) Verificar Node.js
:: ----------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado no seu computador.
    echo Baixe e instale em: https://nodejs.org ^(versao LTS^)
    echo Depois de instalar, feche esta janela e execute este arquivo de novo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo [OK] Node.js encontrado: %NODE_VERSION%

:: ----------------------------------------
:: 2) Verificar se e um repositorio Git
:: ----------------------------------------
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Esta pasta nao e um repositorio Git.
    echo Execute este arquivo dentro da pasta do projeto clonado do GitHub.
    pause
    exit /b 1
)
echo [OK] Repositorio Git valido.

:: ----------------------------------------
:: 3) Verificar/instalar PM2
:: ----------------------------------------
where pm2 >nul 2>nul
if errorlevel 1 (
    echo [INFO] Instalando PM2 globalmente ^(gerenciador de processos^)...
    call npm install -g pm2
)
echo [OK] PM2 disponivel.
echo.

:: ----------------------------------------
:: 4) Instalar dependencias se necessario
:: ----------------------------------------
if not exist "node_modules" (
    echo [INFO] Primeira execucao detectada. Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
    echo.
)

:: ----------------------------------------
:: 5) Criar .env se necessario
:: ----------------------------------------
if not exist ".env" (
    echo [INFO] Arquivo .env nao encontrado. Criando a partir do .env.example...
    copy /y ".env.example" ".env" >nul
    echo [ATENCAO] Edite o arquivo .env com suas chaves reais ^(Supabase etc^)
    echo antes de usar em producao. Valores de exemplo sao suficientes
    echo para testar localmente.
    echo.
)

goto :menu

:menu
echo ========================================
echo   MENU PRINCIPAL
echo ========================================
echo.
echo   1. Atualizar projeto ^(git pull^)
echo   2. Iniciar servidor ^(site + bot WhatsApp^)
echo   3. Parar servidor
echo   4. Reiniciar servidor
echo   5. Ver status do servidor
echo   6. Ver logs em tempo real
echo   7. Abrir no navegador
echo   8. Reinstalar dependencias ^(npm install^)
echo   9. Sair
echo.
set /p opcao="Escolha uma opcao (1-9): "

if "%opcao%"=="1" goto :atualizar
if "%opcao%"=="2" goto :iniciar
if "%opcao%"=="3" goto :parar
if "%opcao%"=="4" goto :reiniciar
if "%opcao%"=="5" goto :status
if "%opcao%"=="6" goto :logs
if "%opcao%"=="7" goto :abrir
if "%opcao%"=="8" goto :reinstalar
if "%opcao%"=="9" goto :sair

echo.
echo [ERRO] Opcao invalida!
pause
cls
goto :menu

:atualizar
echo.
echo [INFO] Verificando alteracoes locais que podem travar a atualizacao...
git diff --name-only -- package-lock.json | findstr /r "." >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Descartando alteracoes locais em package-lock.json...
    git checkout -- package-lock.json
)
echo [INFO] Baixando atualizacoes do GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel atualizar automaticamente.
    echo Voce provavelmente editou algum arquivo do projeto manualmente.
    echo Rode "git status" no terminal para ver o que foi alterado.
) else (
    echo [OK] Projeto atualizado! Reinstalando dependencias por seguranca...
    call npm install
    echo [OK] Pronto!
)
echo.
pause
cls
goto :menu

:iniciar
echo.
echo [INFO] Iniciando servidor com PM2 ^(site + bot WhatsApp juntos^)...
call pm2 delete marmoraria >nul 2>nul
call pm2 start npm --name marmoraria -- run dev
echo.
echo [OK] Servidor iniciado!
echo [INFO] Acesse: http://localhost:3000
echo [INFO] Para ver o QR Code do WhatsApp, abra o site e va em Ajustes.
echo.
pause
cls
goto :menu

:parar
echo.
echo [INFO] Parando servidor...
call pm2 stop marmoraria
echo [OK] Servidor parado!
echo.
pause
cls
goto :menu

:reiniciar
echo.
echo [INFO] Reiniciando servidor...
call pm2 restart marmoraria
echo [OK] Servidor reiniciado!
echo.
pause
cls
goto :menu

:status
echo.
call pm2 status
echo.
echo [INFO] Consultando status do bot WhatsApp...
curl -s http://localhost:3000/api/bot/status
echo.
echo.
pause
cls
goto :menu

:logs
echo.
echo [INFO] Mostrando logs em tempo real ^(CTRL+C para voltar ao menu^)...
call pm2 logs marmoraria
cls
goto :menu

:abrir
echo.
echo [INFO] Abrindo http://localhost:3000 no navegador padrao...
start "" "http://localhost:3000"
cls
goto :menu

:reinstalar
echo.
echo [INFO] Reinstalando dependencias do zero...
if exist "node_modules" rmdir /s /q "node_modules"
call npm install
echo [OK] Dependencias reinstaladas!
echo.
pause
cls
goto :menu

:sair
echo.
echo Ate logo!
timeout /t 1 >nul
exit /b 0

endlocal
