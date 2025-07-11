@echo off
REM DocChat Full Stack Quick Start Script for Windows

echo 🚀 Starting DocChat Full Stack Application...

REM Check if we're in the right directory
if not exist "backend" (
    echo ❌ Please run this script from the DocChat root directory
    exit /b 1
)
if not exist "frontend" (
    echo ❌ Please run this script from the DocChat root directory
    exit /b 1
)

REM Check prerequisites
echo 🔍 Checking prerequisites...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is required but not installed
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is required but not installed
    exit /b 1
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is required but not installed
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Setup backend
echo 🔧 Setting up backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install backend dependencies
echo 📥 Installing backend dependencies...
pip install -r requirements.txt

REM Check if .env exists
if not exist ".env" (
    echo ⚙️ Creating backend .env file...
    copy .env.example .env
    echo ⚠️  Please edit backend\.env with your API keys before starting the backend
    echo    Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QDRANT_URL, QDRANT_API_KEY, HUGGINGFACE_API_KEY, GEMINI_API_KEY
)

cd ..

REM Setup frontend
echo 🔧 Setting up frontend...
cd frontend\my-app

REM Install frontend dependencies
echo 📥 Installing frontend dependencies...
npm install

REM Check if .env.local exists
if not exist ".env.local" (
    echo ⚙️ Creating frontend .env.local file...
    copy .env.local.example .env.local
    echo ⚠️  Please edit frontend\my-app\.env.local with your Supabase credentials
)

cd ..\..

REM Create start scripts
echo 📝 Creating start scripts...

REM Backend start script
echo @echo off > start-backend.bat
echo echo 🚀 Starting DocChat Backend... >> start-backend.bat
echo cd backend >> start-backend.bat
echo call venv\Scripts\activate.bat >> start-backend.bat
echo python main.py >> start-backend.bat
echo pause >> start-backend.bat

REM Frontend start script
echo @echo off > start-frontend.bat
echo echo 🚀 Starting DocChat Frontend... >> start-frontend.bat
echo cd frontend\my-app >> start-frontend.bat
echo npm run dev >> start-frontend.bat
echo pause >> start-frontend.bat

echo 🎉 Setup complete!
echo 📋 Next steps:
echo 1. Configure your API keys in backend\.env
echo 2. Configure your Supabase credentials in frontend\my-app\.env.local
echo 3. Start the backend: start-backend.bat
echo 4. Start the frontend: start-frontend.bat
echo.
echo 🌐 URLs:
echo • Frontend: http://localhost:3000
echo • Backend API: http://localhost:8000
echo • Backend Docs: http://localhost:8000/docs
echo.
echo ⚠️  Make sure both backend and frontend are running for full functionality

pause
