# TravelQue - System Verification Script
# Run this to check if everything is configured correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TravelQue - System Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Check Python
Write-Host "[1/8] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "    $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "    Python not found!" -ForegroundColor Red
    $allGood = $false
}

# 2. Check Node.js
Write-Host "[2/8] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "    Node $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "    Node.js not found!" -ForegroundColor Red
    $allGood = $false
}

# 3. Check PostgreSQL
Write-Host "[3/8] Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    if ($pgService.Status -eq "Running") {
        Write-Host "    PostgreSQL is running" -ForegroundColor Green
    } else {
        Write-Host "    PostgreSQL installed but not running" -ForegroundColor Yellow
        Write-Host "    Run: Start-Service $($pgService.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "    PostgreSQL not found!" -ForegroundColor Red
    $allGood = $false
}

# 4. Check Backend Directory
Write-Host "[4/8] Checking backend directory..." -ForegroundColor Yellow
if (Test-Path "D:\SheCodes_app_travelQue\backend") {
    Write-Host "    Backend directory exists" -ForegroundColor Green
    
    # Check virtual environment
    if (Test-Path "D:\SheCodes_app_travelQue\backend\env") {
        Write-Host "    Virtual environment exists" -ForegroundColor Green
    } else {
        Write-Host "    Virtual environment missing!" -ForegroundColor Red
        $allGood = $false
    }
    
    # Check .env file
    if (Test-Path "D:\SheCodes_app_travelQue\backend\.env") {
        Write-Host "    .env file exists" -ForegroundColor Green
    } else {
        Write-Host "    .env file missing!" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "    Backend directory not found!" -ForegroundColor Red
    $allGood = $false
}

# 5. Check Frontend Directory
Write-Host "[5/8] Checking frontend directory..." -ForegroundColor Yellow
if (Test-Path "D:\SheCodes_app_travelQue\frontend") {
    Write-Host "    Frontend directory exists" -ForegroundColor Green
    
    # Check node_modules
    if (Test-Path "D:\SheCodes_app_travelQue\frontend\node_modules") {
        Write-Host "    node_modules installed" -ForegroundColor Green
    } else {
        Write-Host "    node_modules missing - run: npm install" -ForegroundColor Yellow
    }
    
    # Check package.json
    if (Test-Path "D:\SheCodes_app_travelQue\frontend\package.json") {
        Write-Host "    package.json exists" -ForegroundColor Green
    } else {
        Write-Host "    package.json missing!" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "    Frontend directory not found!" -ForegroundColor Red
    $allGood = $false
}

# 6. Get Local IP
Write-Host "[6/8] Checking network configuration..." -ForegroundColor Yellow
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -ne '127.0.0.1' }).IPAddress | Select-Object -First 1
if ($localIP) {
    Write-Host "    Local IP: $localIP" -ForegroundColor Green
} else {
    Write-Host "    Could not detect local IP!" -ForegroundColor Red
    $allGood = $false
}

# 7. Check if Backend is Running
Write-Host "[7/8] Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "    Backend is running!" -ForegroundColor Green
    Write-Host "    Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "    Backend is not running (this is OK if you haven't started it)" -ForegroundColor Gray
}

# 8. Check if Frontend is Running
Write-Host "[8/8] Checking if frontend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "    Frontend is running!" -ForegroundColor Green
} catch {
    Write-Host "    Frontend is not running (this is OK if you haven't started it)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "   All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Ready to start:" -ForegroundColor Cyan
    Write-Host "   1. Backend:  .\backend\start-backend.ps1" -ForegroundColor White
    Write-Host "   2. Frontend: .\frontend\start-frontend.ps1" -ForegroundColor White
} else {
    Write-Host "   Some checks failed!" -ForegroundColor Red
    Write-Host "   Please fix the issues above before starting." -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Display current configuration
Write-Host "Current Configuration:" -ForegroundColor Cyan
Write-Host "  Backend API:  http://$localIP:8000" -ForegroundColor White
Write-Host "  API Docs:     http://$localIP:8000/docs" -ForegroundColor White
Write-Host "  Frontend:     exp://$localIP:8081" -ForegroundColor White
Write-Host "  Database:     postgresql://localhost/travelQue" -ForegroundColor White
Write-Host ""
