# Instala dependências e inicia o CandeiasNexusCRM
Write-Host "=== CandeiasNexusCRM ===" -ForegroundColor Cyan

Write-Host "`nInstalando dependencias do backend..." -ForegroundColor Yellow
Set-Location backend
npm install
Write-Host "Backend OK" -ForegroundColor Green

Write-Host "`nInstalando dependencias do frontend..." -ForegroundColor Yellow
Set-Location ../frontend
npm install
Write-Host "Frontend OK" -ForegroundColor Green

Set-Location ..

Write-Host "`nIniciando servidores..." -ForegroundColor Yellow
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\frontend'; npm run dev"

Write-Host "`nPronto! Acesse http://localhost:3000 no browser." -ForegroundColor Green
