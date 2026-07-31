@echo off
cd /d "%~dp0"
echo Instalando leitor de planilhas no Painel Quality...
call npm install xlsx@0.18.5 --save
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel instalar a dependencia.
  pause
  exit /b 1
)
echo.
echo Dependencia instalada com sucesso.
pause
