# Start Backend Server
# Run this in PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TravelQue - Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location -Path "D:\SheCodes_app_travelQue\backend"

# Activate virtual environment
Write-Host "[1/3] Activating virtual environment..." -ForegroundColor Yellow
& ".\env\Scripts\Activate.ps1"

# Check if PostgreSQL is running
Write-Host "[2/3] Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if ($pgService) {
    Write-Host "    PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "    WARNING: PostgreSQL may not be running!" -ForegroundColor Red
}

# Get local IP
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -ne '127.0.0.1' }).IPAddress | Select-Object -First 1
Write-Host ""
Write-Host "Backend will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:8000" -ForegroundColor Green
Write-Host "  http://${localIP}:8000" -ForegroundColor Green
Write-Host ""

# Start server
Write-Host "[3/3] Starting FastAPI server..." -ForegroundColor Yellow
Write-Host "    Press CTRL+C to stop" -ForegroundColor Gray
Write-Host ""
uvicorn main:app --reload --host 0.0.0.0 --port 8000
