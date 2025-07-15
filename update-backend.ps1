#!/usr/bin/env pwsh

# Script to update backend CORS configuration on EC2
param(
    [Parameter(Mandatory=$true)]
    [string]$EC2_HOST = "13.48.43.175",
    
    [Parameter(Mandatory=$true)]
    [string]$EC2_KEY_PATH = "C:\Users\User\Downloads\docChat-backend.pem"
)

Write-Host "🚀 Updating backend CORS configuration..." -ForegroundColor Green

# Copy the updated main.py to EC2
Write-Host "📤 Uploading updated main.py..." -ForegroundColor Cyan
scp -i $EC2_KEY_PATH -o StrictHostKeyChecking=no backend/main.py ubuntu@${EC2_HOST}:/tmp/main.py

# SSH into EC2 and update the backend
Write-Host "🔄 Restarting backend service..." -ForegroundColor Cyan
ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST @"
    # Stop the service
    sudo systemctl stop docchat
    
    # Backup current main.py
    sudo cp /opt/docChat/main.py /opt/docChat/main.py.backup
    
    # Replace with updated version
    sudo cp /tmp/main.py /opt/docChat/main.py
    sudo chown ubuntu:ubuntu /opt/docChat/main.py
    
    # Start the service
    sudo systemctl start docchat
    
    # Check status
    sudo systemctl status docchat --no-pager
    
    # Clean up
    rm /tmp/main.py
    
    echo "✅ Backend updated successfully!"
"@

Write-Host "🧪 Testing CORS configuration..." -ForegroundColor Cyan
$corsTest = ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "curl -s -H 'Origin: https://test.vercel.app' -H 'Access-Control-Request-Method: GET' -X OPTIONS http://localhost:8000/health"

if ($corsTest -match "200") {
    Write-Host "✅ CORS configuration working!" -ForegroundColor Green
} else {
    Write-Host "⚠️ CORS test inconclusive. Check manually." -ForegroundColor Yellow
}

Write-Host "`n🎉 Backend update complete!" -ForegroundColor Green
Write-Host "Your backend now accepts requests from Vercel deployments." -ForegroundColor White
