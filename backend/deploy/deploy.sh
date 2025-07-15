#!/bin/bash

# Quick deployment script for DocChat backend
# Run this script on your EC2 instance after initial setup

set -e

echo "🚀 Starting DocChat Backend Deployment..."

APP_DIR="/opt/docChat"
SERVICE_NAME="docChat"
DOMAIN_OR_IP="your-ec2-public-ip"  # Replace with your actual IP or domain

# Check if running as correct user
if [ "$USER" != "ubuntu" ]; then
    echo "❌ Please run this script as ubuntu user"
    exit 1
fi

# Navigate to app directory
cd $APP_DIR

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Test the application
echo "🧪 Testing application..."
python -c "import main; print('✅ Application imports successfully')"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚠️  Creating template .env file..."
    cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Qdrant Configuration
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key

# API Keys
HUGGINGFACE_API_KEY=your_huggingface_key
GEMINI_API_KEY=your_gemini_key

# Application Settings
ENVIRONMENT=production
EOF
    echo "📝 Please edit .env file with your actual API keys"
    echo "Run: nano .env"
    exit 1
fi

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/$SERVICE_NAME
sudo sed -i "s/server_name _;/server_name $DOMAIN_OR_IP;/" /etc/nginx/sites-available/$SERVICE_NAME

# Enable site
sudo ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Configure Supervisor
echo "👷 Configuring Supervisor..."
sudo cp deploy/supervisor.conf /etc/supervisor/conf.d/$SERVICE_NAME.conf

# Update supervisor
sudo supervisorctl reread
sudo supervisorctl update

# Start services
echo "🔄 Starting services..."
sudo systemctl restart nginx
sudo supervisorctl restart $SERVICE_NAME

# Wait a moment for services to start
sleep 5

# Check status
echo "📊 Checking service status..."
sudo supervisorctl status $SERVICE_NAME
sudo systemctl status nginx --no-pager -l

# Test the API
echo "🧪 Testing API endpoint..."
sleep 2
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API is responding on localhost"
else
    echo "❌ API is not responding on localhost"
    echo "Check logs: sudo tail -f /var/log/docChat.log"
fi

# Show useful information
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Useful commands:"
echo "  Check logs: sudo tail -f /var/log/docChat.log"
echo "  Restart service: sudo supervisorctl restart $SERVICE_NAME"
echo "  Check status: sudo supervisorctl status"
echo ""
echo "🌐 Your API should be available at:"
echo "  HTTP: http://$DOMAIN_OR_IP"
echo "  Health check: http://$DOMAIN_OR_IP/health"
echo "  API docs: http://$DOMAIN_OR_IP/docs"
echo ""
echo "🔧 Next steps:"
echo "  1. Update your frontend API endpoint to point to this server"
echo "  2. Test all API endpoints"
echo "  3. Set up SSL certificate (optional but recommended)"
echo "  4. Configure domain name (if using one)"
