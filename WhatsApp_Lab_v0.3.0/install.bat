@echo off
setlocal
cd /d "%~dp0"
title Instalar Quality WhatsApp Lab
call npm install
if errorlevel 1 (
  echo.
  echo Falha na instalacao.
  pause
  exit /b 1
)
call npm run check
echo.
echo Instalacao e validacao concluidas.
pause
