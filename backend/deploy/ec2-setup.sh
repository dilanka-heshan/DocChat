#!/bin/bash

# EC2 Setup Script for DocChat Backend
# This script sets up the environment on a fresh Ubuntu EC2 instance

set -e

echo "🚀 Starting DocChat Backend Setup on EC2..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required system packages
echo "🔧 Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    nginx \
    supervisor \
    htop \
    curl \
    wget \
    unzip

# Install Docker (optional - for containerized deployment)
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/docChat
sudo chown $USER:$USER /opt/docChat
cd /opt/docChat

# Create Python virtual environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Clone your repository (you'll need to replace this with your actual repo)
echo "📥 Cloning repository..."
# git clone <your-repo-url> .
# For now, we'll create the directory structure manually

# Create directory structure
mkdir -p backend
cd backend

echo "✅ Basic setup complete! Next steps:"
echo "1. Upload your backend code to /opt/docChat/backend/"
echo "2. Set up environment variables"
echo "3. Install Python dependencies"
echo "4. Configure Nginx"
echo "5. Set up process management with Supervisor"
