@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (echo Node.js nao encontrado. & pause & exit /b 1)
node aplicar-no-club.cjs
if errorlevel 1 (echo O index.html nao foi alterado. Confira a pasta de destino. & pause & exit /b 1)
echo Arquivos prontos para enviar ao GitHub.
pause
