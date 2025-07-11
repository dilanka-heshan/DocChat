#!/bin/bash

# DocChat RAG Backend Setup Script

echo "🚀 Setting up DocChat RAG Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3."
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Copy environment file
echo "⚙️ Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please edit .env file with your API keys and configuration"
else
    echo "ℹ️  .env file already exists"
fi

# Check environment variables
echo "🔍 Checking environment variables..."
python3 -c "
import os
from dotenv import load_dotenv

load_dotenv()

required_vars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'QDRANT_URL',
    'QDRANT_API_KEY',
    'HUGGINGFACE_API_KEY',
    'GEMINI_API_KEY'
]

missing = []
for var in required_vars:
    if not os.getenv(var):
        missing.append(var)

if missing:
    print(f'❌ Missing environment variables: {', '.join(missing)}')
    print('Please add these to your .env file')
    exit(1)
else:
    print('✅ All required environment variables are set')
"

if [ $? -ne 0 ]; then
    echo "Please configure your .env file and run this script again."
    exit 1
fi

echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""
echo "To start in production mode:"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000"
