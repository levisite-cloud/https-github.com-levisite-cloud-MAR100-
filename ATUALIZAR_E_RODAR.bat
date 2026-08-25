@echo off
setlocal EnableExtensions
color 0A
chcp 65001 >nul
cd /d "%~dp0"

title MARMORARIA IMPERIAL - ATUALIZAR E RODAR

echo ========================================
echo   MARMORARIA IMPERIAL - ATUALIZADOR
echo ========================================
echo.

:: Verificar se estamos dentro de um repositorio git
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Esta pasta nao e um repositorio Git.
    echo Certifique-se de rodar este arquivo dentro da pasta do projeto clonado.
    pause
    exit /b 1
)

echo [1/5] Verificando alteracoes locais que podem travar a atualizacao...
:: package-lock.json costuma ser modificado automaticamente pelo npm install
:: e isso trava o "git pull". Descartamos apenas esse arquivo, sem mexer
:: em nenhum outro arquivo que voce tenha editado de verdade.
git diff --name-only -- package-lock.json | findstr /r "." >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Descartando alteracoes locais em package-lock.json...
    git checkout -- package-lock.json
)
echo.

echo [2/5] Baixando atualizacoes do GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel atualizar automaticamente.
    echo Isso geralmente acontece quando VOCE editou algum arquivo do
    echo projeto manualmente. Rode "git status" para ver quais arquivos
    echo foram alterados e decida se quer manter ou descartar essas mudancas.
    pause
    exit /b 1
)
echo.

echo [3/5] Instalando/atualizando dependencias...
call npm install
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependencias. Verifique sua conexao
    echo com a internet e se o Node.js esta instalado corretamente.
    pause
    exit /b 1
)
echo.

echo [4/5] Verificando arquivo de configuracao (.env)...
if not exist ".env" (
    echo [INFO] Arquivo .env nao encontrado. Criando a partir do .env.example...
    copy /y ".env.example" ".env" >nul
    echo [ATENCAO] Edite o arquivo .env com suas chaves reais antes de usar
    echo em producao ^(Supabase, etc^). Por enquanto ele foi criado com
    echo valores de exemplo, suficiente para testar localmente.
)
echo.

echo [5/5] Iniciando o servidor...
echo ========================================
echo   Acesse: http://localhost:3000
echo   Pressione CTRL+C para parar o servidor
echo ========================================
echo.
call npm run dev

pause
endlocal
