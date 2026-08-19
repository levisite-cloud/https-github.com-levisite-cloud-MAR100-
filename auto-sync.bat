@echo off
cd /d "C:\Users\samsung\Documents\Default Project\https-github.com-levisite-cloud-MAR100-"
echo ========================================
echo   MAR100 - Auto Sync GitHub
echo ========================================
echo.
echo Monitorando alteracoes no projeto...
echo Pressione Ctrl+C para parar.
echo.

:loop
REM Verificar se ha alteracoes
git status --porcelain > temp_sync.txt 2>nul
set /p changes=<temp_sync.txt
del temp_sync.txt 2>nul

if defined changes (
    echo [%date% %time%] Alteracoes detectadas, sincronizando...
    
    REM Adicionar todas as alteracoes
    git add -A
    
    REM Criar commit automatico com timestamp
    for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set datestr=%%a%%b%%c
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set timestr=%%a%%b
    
    git commit -m "auto-sync: atualizacao automatica %date% %time%"
    
    REM Enviar para o GitHub
    git push origin main
    
    echo [%date% %time%] Sincronizado com sucesso!
    echo.
)

REM Aguardar 30 segundos antes da proxima verificacao
timeout /t 30 /nobreak >nul
goto loop
