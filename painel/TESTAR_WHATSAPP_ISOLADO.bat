@echo off
setlocal
cd /d "%~dp0"
title Quality ERP - Teste isolado WhatsApp

echo =============================================================
echo  Quality ERP - Teste isolado do WhatsApp Web
echo =============================================================
echo.
echo Antes de continuar, feche totalmente o servidor do Quality ERP.
echo O teste nao envia mensagens e nao executa automacoes.
echo.
pause

echo.
node scripts\whatsapp-isolated-pairing.js

echo.
echo =============================================================
if errorlevel 1 (
  echo O teste terminou sem concluir o pareamento.
  echo Leia a mensagem acima antes de tentar novamente.
) else (
  echo Teste concluido. Agora voce pode iniciar o Quality ERP.
)
echo =============================================================
echo.
pause
endlocal
