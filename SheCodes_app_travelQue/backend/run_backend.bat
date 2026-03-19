@echo off
cd /d "%~dp0"
venv\Scripts\python -m uvicorn main:app --reload --port 8000
pause
