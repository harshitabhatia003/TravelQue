@echo off
REM TravelQue - Quick Start Script for Windows
REM This script helps you start both backend and frontend servers

echo ========================================
echo   TravelQue - Development Server Setup
echo ========================================
echo.

REM Get local IP address
echo [1/5] Detecting your local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4 Address" ^| findstr /V "127.0.0.1"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP:~1%
echo     Local IP: %LOCAL_IP%
echo.

REM Check if PostgreSQL is running
echo [2/5] Checking PostgreSQL status...
sc query postgresql-x64-14 | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo     PostgreSQL is running [OK]
) else (
    echo     PostgreSQL is NOT running [WARNING]
    echo     Starting PostgreSQL...
    net start postgresql-x64-14
)
echo.

REM Display configuration
echo [3/5] Current Configuration:
echo     Backend API: http://%LOCAL_IP%:8000
echo     Frontend:    exp://%LOCAL_IP%:8081
echo     Database:    localhost/travelQue
echo.

echo [4/5] Instructions:
echo     1. Open TWO PowerShell terminals
echo     2. Terminal 1 (Backend):
echo        cd D:\SheCodes_app_travelQue\backend
echo        .\env\Scripts\Activate.ps1
echo        uvicorn main:app --reload --host 0.0.0.0
echo.
echo     3. Terminal 2 (Frontend):
echo        cd D:\SheCodes_app_travelQue\frontend
echo        npx expo start --clear
echo.

echo [5/5] Quick Test Commands:
echo     Test Backend:  Invoke-RestMethod -Uri "http://%LOCAL_IP%:8000/health"
echo     API Docs:      http://%LOCAL_IP%:8000/docs
echo.

echo ========================================
echo   Ready to start! Follow instructions above.
echo ========================================
pause
