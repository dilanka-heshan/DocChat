# PowerShell script to upload DocChat backend to EC2
# Run this from your Windows machine

param(
    [Parameter(Mandatory=$true)]
    [string]$KeyPath,
    
    [Parameter(Mandatory=$true)]
    [string]$EC2Host,
    
    [string]$LocalBackendPath = ".\backend"
)

Write-Host "🚀 Uploading DocChat Backend to EC2..." -ForegroundColor Green

# Check if required tools are available
$tools = @("scp", "ssh")
foreach ($tool in $tools) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Host "❌ $tool not found. Please install OpenSSH client." -ForegroundColor Red
        Write-Host "You can install it via: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
        exit 1
    }
}

# Validate inputs
if (!(Test-Path $KeyPath)) {
    Write-Host "❌ SSH key file not found: $KeyPath" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $LocalBackendPath)) {
    Write-Host "❌ Backend directory not found: $LocalBackendPath" -ForegroundColor Red
    exit 1
}

# Create temporary archive
$tempFile = "backend-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
Write-Host "📦 Creating archive: $tempFile" -ForegroundColor Blue

# Use WSL tar if available, otherwise use 7zip or similar
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    wsl tar -czf $tempFile -C $LocalBackendPath .
} else {
    # Alternative: compress to zip and convert on server
    Compress-Archive -Path "$LocalBackendPath\*" -DestinationPath "backend.zip" -Force
    $tempFile = "backend.zip"
}

try {
    # Upload the archive
    Write-Host "⬆️  Uploading files to EC2..." -ForegroundColor Blue
    scp -i $KeyPath -o StrictHostKeyChecking=no $tempFile ubuntu@${EC2Host}:/home/ubuntu/

    # Extract and set up on remote server
    Write-Host "📂 Extracting files on EC2..." -ForegroundColor Blue
    
    $setupCommands = @"
sudo mkdir -p /opt/docChat
sudo chown ubuntu:ubuntu /opt/docChat
cd /opt/docChat
"@

    if ($tempFile.EndsWith(".tar.gz")) {
        $setupCommands += @"
tar -xzf /home/ubuntu/$tempFile
"@
    } else {
        $setupCommands += @"
unzip -o /home/ubuntu/$tempFile
"@
    }

    $setupCommands += @"
rm /home/ubuntu/$tempFile
chmod +x deploy/*.sh
echo "✅ Files uploaded successfully!"
echo "📁 Files are now in /opt/docChat"
echo "🔧 Next: Run the deployment script"
echo "   cd /opt/docChat && ./deploy/deploy.sh"
"@

    ssh -i $KeyPath -o StrictHostKeyChecking=no ubuntu@$EC2Host $setupCommands

    Write-Host ""
    Write-Host "🎉 Upload completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. SSH into your EC2 instance:" -ForegroundColor White
    Write-Host "   ssh -i $KeyPath ubuntu@$EC2Host" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Run the deployment script:" -ForegroundColor White
    Write-Host "   cd /opt/docChat" -ForegroundColor Gray
    Write-Host "   nano .env  # Add your API keys" -ForegroundColor Gray
    Write-Host "   ./deploy/deploy.sh" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "❌ Upload failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temporary file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile
        Write-Host "🧹 Cleaned up temporary file" -ForegroundColor Blue
    }
}
