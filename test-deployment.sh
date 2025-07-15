#!/bin/bash

# DocChat Deployment Testing Script
# Usage: ./test-deployment.sh <EC2_HOST> <EC2_KEY_PATH>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <EC2_HOST> <EC2_KEY_PATH>"
    echo "Example: $0 ec2-xxx.compute-1.amazonaws.com ./ec2-key.pem"
    exit 1
fi

EC2_HOST=$1
EC2_KEY_PATH=$2

echo "🔍 Testing DocChat Deployment on $EC2_HOST"
echo "=================================================="

# Test 1: Check if the service is running
echo -e "\n1. 📊 Checking service status..."
ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "sudo systemctl status docchat --no-pager"

# Test 2: Check health endpoint
echo -e "\n2. 🏥 Testing health endpoint..."
HEALTH_CHECK=$(ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health" 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Health endpoint responding correctly (200)"
else
    echo "❌ Health endpoint returned: $HEALTH_CHECK"
fi

# Test 3: Test API documentation endpoint
echo -e "\n3. 📚 Testing API documentation..."
DOCS_CHECK=$(ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/docs" 2>/dev/null || echo "000")
if [ "$DOCS_CHECK" = "200" ]; then
    echo "✅ API docs accessible (200)"
else
    echo "❌ API docs returned: $DOCS_CHECK"
fi

# Test 4: Check application logs
echo -e "\n4. 📝 Recent application logs..."
ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "sudo journalctl -u docchat --no-pager -n 10"

# Test 5: Check if ports are open
echo -e "\n5. 🌐 Checking port 8000..."
ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "ss -tulpn | grep :8000"

# Test 6: Test basic API endpoints
echo -e "\n6. 🧪 Testing API endpoints..."
ROOT_CHECK=$(ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/" 2>/dev/null || echo "000")
echo "Root endpoint (/): $ROOT_CHECK"

# Get public IP for external access info
echo -e "\n7. 🌍 Getting public access information..."
PUBLIC_IP=$(ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null)
echo "Public IP: $PUBLIC_IP"

echo -e "\n🎉 Testing complete!"
echo -e "\n📋 Access URLs:"
echo "   API Base: http://$PUBLIC_IP:8000"
echo "   Health Check: http://$PUBLIC_IP:8000/health"
echo "   API Documentation: http://$PUBLIC_IP:8000/docs"
echo "   Interactive API: http://$PUBLIC_IP:8000/redoc"

echo -e "\n⚠️  Security Note:"
echo "   Make sure your EC2 security group allows inbound traffic on port 8000"
echo "   from your IP address or appropriate IP ranges."
