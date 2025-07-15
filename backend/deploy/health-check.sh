#!/bin/bash

# Health check script for DocChat backend

APP_DIR="/opt/docChat"
SERVICE_NAME="docChat"

echo "🏥 DocChat Backend Health Check"
echo "================================"

# Check if app directory exists
if [ -d "$APP_DIR" ]; then
    echo "✅ App directory exists: $APP_DIR"
else
    echo "❌ App directory missing: $APP_DIR"
    exit 1
fi

# Check virtual environment
if [ -f "$APP_DIR/venv/bin/activate" ]; then
    echo "✅ Virtual environment exists"
else
    echo "❌ Virtual environment missing"
fi

# Check environment file
if [ -f "$APP_DIR/.env" ]; then
    echo "✅ Environment file exists"
    # Check if it's not just the template
    if grep -q "your_" "$APP_DIR/.env"; then
        echo "⚠️  Environment file contains template values"
    fi
else
    echo "❌ Environment file missing"
fi

# Check supervisor status
echo ""
echo "📊 Service Status:"
sudo supervisorctl status $SERVICE_NAME

# Check nginx status  
echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l | head -10

# Check if port 8000 is listening
echo ""
echo "🔌 Port Status:"
if netstat -tlnp | grep -q ":8000"; then
    echo "✅ Port 8000 is listening"
else
    echo "❌ Port 8000 is not listening"
fi

# Test local API
echo ""
echo "🧪 API Test:"
if curl -f -s http://localhost:8000/health > /dev/null; then
    echo "✅ API responds on localhost"
    curl -s http://localhost:8000/health | python3 -m json.tool
else
    echo "❌ API not responding on localhost"
fi

# Check logs for errors
echo ""
echo "📋 Recent Logs (last 10 lines):"
if [ -f "/var/log/docChat.log" ]; then
    tail -10 /var/log/docChat.log
else
    echo "❌ Log file not found"
fi

# System resources
echo ""
echo "💻 System Resources:"
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "🔧 Troubleshooting:"
echo "  - View full logs: sudo tail -f /var/log/docChat.log"
echo "  - Restart service: sudo supervisorctl restart $SERVICE_NAME"
echo "  - Check nginx config: sudo nginx -t"
echo "  - Check security groups: Allow ports 22, 80, 443, 8000"
