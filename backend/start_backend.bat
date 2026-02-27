@echo off
cd /d "%~dp0"
echo ====================================================
echo    Starting ThyroRAG Backend Server
echo ====================================================
echo.
echo 1. Activating virtual environment...
if exist ..\venv\Scripts\python.exe (
    set "PYTHON_EXE=..\venv\Scripts\python.exe"
) else (
    echo Error: Virtual environment not found at ..\venv
    pause
    exit /b
)

echo 2. Starting Uvicorn server...
echo    Command: %PYTHON_EXE% -m uvicorn main:app
echo.
"%PYTHON_EXE%" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
