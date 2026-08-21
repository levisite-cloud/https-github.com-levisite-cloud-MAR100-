@echo off
setlocal
cd /d "%~dp0"
color 0A
chcp 65001 >nul

echo ============================================================
echo        MARMORARIA IMPERIAL - WHATSAPP BOT
echo ============================================================
echo.
echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao esta instalado ou nao esta no PATH.
  echo Instale Node.js 20+ e execute este arquivo novamente.
  pause
  exit /b 1
)

echo Node.js encontrado:
node --version

echo.
echo Instalando/atualizando dependencias...
npm install
if errorlevel 1 (
  echo.
  echo [ERRO] Falha no npm install.
  pause
  exit /b 1
)

echo.
echo Iniciando servidor e WhatsApp Bot...
echo Nao feche esta janela enquanto quiser manter o bot conectado.
echo.
npm run start:bot

if errorlevel 1 (
  echo.
  echo [ERRO] O servidor foi encerrado com erro.
  pause
)
endlocal
