@echo off
title Iniciando CandeiasNexus CRM
echo ==========================================
echo   INICIANDO CANDEIAS NEXUS CRM
echo ==========================================

REM Obtem o diretorio onde o arquivo .bat esta localizado
set BASE_DIR=%~dp0

echo [1/2] Iniciando Backend na porta 3001...
cd /d "%BASE_DIR%backend"
if not exist node_modules (
    echo Instalando dependencias do backend...
    call npm install
)

echo Executando testes de sanidade e configuracao...
node src/test-db.js
if %errorlevel% neq 0 (
    echo ❌ Falha nos testes de sanidade. Verifique os erros acima.
    pause
    exit /b
)

echo Garantindo usuario administrador (Seed)...
node src/seed.js

REM Verifica se o arquivo .env existe, se nao existir, avisa o usuario
if not exist .env echo AVISO: Arquivo backend/.env nao encontrado!
start "Nexus-Backend" cmd /k "node src/index.js || pause"

echo [2/2] Iniciando Frontend na porta 3000...
cd /d "%BASE_DIR%frontend"
if not exist node_modules (
    echo Instalando dependencias do frontend...
    call npm install
)
start "Nexus-Frontend" cmd /k "npm start || npm run dev || pause"

echo.
echo Operacao concluida! 
echo Verifique as janelas pretas abertas para mensagens de erro.
echo O sistema estara pronto quando o frontend abrir no seu navegador.
pause