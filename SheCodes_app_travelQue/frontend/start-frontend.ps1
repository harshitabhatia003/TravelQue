# Start Frontend (Expo)
# Run this in PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TravelQue - Frontend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location -Path "D:\SheCodes_app_travelQue\frontend"

# Check backend is running
Write-Host "[1/3] Checking backend connection..." -ForegroundColor Yellow
try {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -ne '127.0.0.1' }).IPAddress | Select-Object -First 1
    $response = Invoke-RestMethod -Uri "http://${localIP}:8000/health" -TimeoutSec 2
    Write-Host "    Backend is running at http://${localIP}:8000" -ForegroundColor Green
} catch {
    Write-Host "    WARNING: Backend may not be running!" -ForegroundColor Red
    Write-Host "    Start backend first with: .\backend\start-backend.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/3] Configuration:" -ForegroundColor Yellow
Write-Host "    API Target: http://${localIP}:8000/api" -ForegroundColor Gray
Write-Host "    Expo Server: exp://${localIP}:8081" -ForegroundColor Gray
Write-Host ""

# Start Expo
Write-Host "[3/3] Starting Expo development server..." -ForegroundColor Yellow
Write-Host "    Press 'a' to open Android emulator" -ForegroundColor Gray
Write-Host "    Press 'w' to open in web browser" -ForegroundColor Gray
Write-Host "    Scan QR code with Expo Go on your phone" -ForegroundColor Gray
Write-Host ""
npx expo start --clear
