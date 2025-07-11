@echo off
REM DocChat RAG Backend Setup Script for Windows

echo 🚀 Setting up DocChat RAG Backend...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    exit /b 1
)

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip is not installed. Please install pip.
    exit /b 1
)

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Copy environment file
echo ⚙️ Setting up environment variables...
if not exist .env (
    copy .env.example .env
    echo ✅ Created .env file from .env.example
    echo ⚠️  Please edit .env file with your API keys and configuration
) else (
    echo ℹ️  .env file already exists
)

echo 🎉 Setup complete!
echo.
echo To start the development server:
echo   venv\Scripts\activate.bat
echo   python main.py
echo.
echo To start in production mode:
echo   venv\Scripts\activate.bat
echo   uvicorn main:app --host 0.0.0.0 --port 8000

pause
