# DocChat Deployment Testing Script
# Run this script to verify your deployment is working correctly

param(
    [Parameter(Mandatory=$true)]
    [string]$EC2_HOST,
    
    [Parameter(Mandatory=$true)]
    [string]$EC2_KEY_PATH
)

Write-Host "🔍 Testing DocChat Deployment on $EC2_HOST" -ForegroundColor Green
Write-Host "=" * 50

# Test 1: Check if the service is running
Write-Host "`n1. 📊 Checking service status..." -ForegroundColor Cyan
ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "sudo systemctl status docchat --no-pager"

# Test 2: Check health endpoint
Write-Host "`n2. 🏥 Testing health endpoint..." -ForegroundColor Cyan
$healthCheck = ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health"
if ($healthCheck -eq "200") {
    Write-Host "✅ Health endpoint responding correctly (200)" -ForegroundColor Green
} else {
    Write-Host "❌ Health endpoint returned: $healthCheck" -ForegroundColor Red
}

# Test 3: Test API documentation endpoint
Write-Host "`n3. 📚 Testing API documentation..." -ForegroundColor Cyan
$docsCheck = ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/docs"
if ($docsCheck -eq "200") {
    Write-Host "✅ API docs accessible (200)" -ForegroundColor Green
} else {
    Write-Host "❌ API docs returned: $docsCheck" -ForegroundColor Red
}

# Test 4: Check application logs
Write-Host "`n4. 📝 Recent application logs..." -ForegroundColor Cyan
ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "sudo journalctl -u docchat --no-pager -n 10"

# Test 5: Check if ports are open
Write-Host "`n5. 🌐 Checking port 8000..." -ForegroundColor Cyan
ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "ss -tulpn | grep :8000"

# Test 6: Test basic API endpoints
Write-Host "`n6. 🧪 Testing API endpoints..." -ForegroundColor Cyan

# Test the root endpoint
$rootCheck = ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/"
Write-Host "Root endpoint (/): $rootCheck"

# Get public IP for external access info
Write-Host "`n7. 🌍 Getting public access information..." -ForegroundColor Cyan
$publicIP = ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s http://169.254.169.254/latest/meta-data/public-ipv4"
Write-Host "Public IP: $publicIP"

Write-Host "`n🎉 Testing complete!" -ForegroundColor Green
Write-Host "`n📋 Access URLs:" -ForegroundColor Yellow
Write-Host "   API Base: http://$publicIP:8000"
Write-Host "   Health Check: http://$publicIP:8000/health"
Write-Host "   API Documentation: http://$publicIP:8000/docs"
Write-Host "   Interactive API: http://$publicIP:8000/redoc"

Write-Host "`n⚠️  Security Note:" -ForegroundColor Yellow
Write-Host "   Make sure your EC2 security group allows inbound traffic on port 8000"
Write-Host "   from your IP address or appropriate IP ranges."
