#!/bin/bash

# DocChat Full Stack Quick Start Script

echo "🚀 Starting DocChat Full Stack Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Please run this script from the DocChat root directory${NC}"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Setup backend
echo -e "${BLUE}🔧 Setting up backend...${NC}"
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}🔄 Activating virtual environment...${NC}"
source venv/bin/activate

# Install backend dependencies
echo -e "${YELLOW}📥 Installing backend dependencies...${NC}"
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️ Creating backend .env file...${NC}"
    cp .env.example .env
    echo -e "${RED}⚠️  Please edit backend/.env with your API keys before starting the backend${NC}"
    echo -e "${RED}   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QDRANT_URL, QDRANT_API_KEY, HUGGINGFACE_API_KEY, GEMINI_API_KEY${NC}"
fi

cd ..

# Setup frontend
echo -e "${BLUE}🔧 Setting up frontend...${NC}"
cd frontend/my-app

# Install frontend dependencies
echo -e "${YELLOW}📥 Installing frontend dependencies...${NC}"
npm install

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚙️ Creating frontend .env.local file...${NC}"
    cp .env.local.example .env.local
    echo -e "${RED}⚠️  Please edit frontend/my-app/.env.local with your Supabase credentials${NC}"
fi

cd ../..

# Create start script
echo -e "${BLUE}📝 Creating start scripts...${NC}"

# Backend start script
cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting DocChat Backend..."
cd backend
source venv/bin/activate
python main.py
EOF

# Frontend start script
cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting DocChat Frontend..."
cd frontend/my-app
npm run dev
EOF

# Make scripts executable
chmod +x start-backend.sh
chmod +x start-frontend.sh

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. Configure your API keys in backend/.env"
echo -e "2. Configure your Supabase credentials in frontend/my-app/.env.local"
echo -e "3. Start the backend: ./start-backend.sh"
echo -e "4. Start the frontend: ./start-frontend.sh"
echo -e ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo -e "• Frontend: http://localhost:3000"
echo -e "• Backend API: http://localhost:8000"
echo -e "• Backend Docs: http://localhost:8000/docs"
echo -e ""
echo -e "${YELLOW}⚠️  Make sure both backend and frontend are running for full functionality${NC}"
