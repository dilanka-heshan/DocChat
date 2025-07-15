#!/bin/bash

# Update script for DocChat backend
# Use this to update your application code

set -e

APP_DIR="/opt/docChat"
SERVICE_NAME="docChat"

echo "🔄 Updating DocChat Backend..."

cd $APP_DIR

# Stop the service
echo "⏹️  Stopping service..."
sudo supervisorctl stop $SERVICE_NAME

# Backup current version (optional)
echo "💾 Creating backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
sudo cp -r $APP_DIR /opt/docChat_backup_$timestamp

# Pull latest changes (if using git)
# git pull origin main

# Activate virtual environment and update dependencies
source venv/bin/activate
pip install -r requirements.txt

# Start the service
echo "▶️  Starting service..."
sudo supervisorctl start $SERVICE_NAME

# Check status
sleep 3
sudo supervisorctl status $SERVICE_NAME

echo "✅ Update complete!"
