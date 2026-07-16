@echo off
setlocal
cd /d "%~dp0"
title Quality WhatsApp Lab v0.1.0

echo.
echo ====================================================
echo       QUALITY WHATSAPP LAB v0.1.0
echo ====================================================
echo.
echo IMPORTANTE: feche o Painel Quality antes de executar.
echo A mesma sessao LocalAuth nao deve ser aberta duas vezes.
echo.

if not exist node_modules (
  echo Dependencias nao encontradas. Executando npm install...
  call npm install
  if errorlevel 1 goto :error
)

call npm run check
if errorlevel 1 goto :error

node src\bootstrap.js
set EXIT_CODE=%ERRORLEVEL%
echo.
if not "%EXIT_CODE%"=="0" (
  echo O diagnostico terminou com erro. Consulte logs e reports.
) else (
  echo Diagnostico concluido. Consulte a pasta reports.
)
echo.
pause
exit /b %EXIT_CODE%

:error
echo.
echo Falha ao preparar ou validar o WhatsApp Lab.
echo.
pause
exit /b 1
