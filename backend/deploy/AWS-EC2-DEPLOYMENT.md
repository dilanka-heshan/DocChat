# DocChat Backend - AWS EC2 Deployment Guide

This guide will walk you through deploying your DocChat backend to AWS EC2 free tier step by step.

## Prerequisites

- AWS Account with EC2 access
- Basic knowledge of Linux commands
- Your API keys for Supabase, Qdrant, Hugging Face, and Gemini

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. **Name**: `docChat-backend`
3. **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
4. **Instance Type**: `t2.micro` (Free tier eligible)
5. **Key Pair**: Create new or use existing SSH key pair
6. **Security Group**: Create new with following rules:
   - SSH (22) - Your IP
   - HTTP (80) - Anywhere (0.0.0.0/0)
   - HTTPS (443) - Anywhere (0.0.0.0/0)
   - Custom TCP (8000) - Anywhere (0.0.0.0/0) [for FastAPI]
7. **Storage**: 8 GB gp3 (Free tier)
8. Click "Launch Instance"

### 1.2 Connect to Instance

```bash
# Replace with your key file and instance IP
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

## Step 2: Initial Server Setup

### 2.1 Run Setup Script

```bash
# Download and run the setup script
wget https://raw.githubusercontent.com/your-repo/backend/deploy/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### 2.2 Manual Setup (if script fails)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip python3-venv git nginx supervisor htop curl wget unzip

# Create app directory
sudo mkdir -p /opt/docChat
sudo chown ubuntu:ubuntu /opt/docChat
cd /opt/docChat

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
```

## Step 3: Upload Your Code

### 3.1 Using SCP (from your local machine)

```bash
# Compress your backend folder
cd /path/to/your/DocChat
tar -czf backend.tar.gz backend/

# Upload to EC2
scp -i "your-key.pem" backend.tar.gz ubuntu@your-ec2-ip:/opt/docChat/

# On EC2, extract the files
cd /opt/docChat
tar -xzf backend.tar.gz
mv backend/* .
rm backend.tar.gz
rmdir backend
```

### 3.2 Using Git (Alternative)

```bash
# On EC2
cd /opt/docChat
git clone https://github.com/your-username/your-repo.git .
```

## Step 4: Configure Environment

### 4.1 Create Environment File

```bash
cd /opt/docChat
nano .env
```

Add your environment variables:

```env
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
```

### 4.2 Install Python Dependencies

```bash
source venv/bin/activate
pip install -r requirements.txt
```

## Step 5: Configure Nginx

### 5.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/docChat
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com your-ec2-public-ip;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/docChat /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: Configure Process Management

### 6.1 Create Supervisor Configuration

```bash
sudo nano /etc/supervisor/conf.d/docChat.conf
```

Add this configuration:

```ini
[program:docChat]
directory=/opt/docChat
command=/opt/docChat/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
user=ubuntu
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/docChat.log
environment=PATH="/opt/docChat/venv/bin"
```

### 6.2 Start Service

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start docChat
```

## Step 7: Test Deployment

### 7.1 Check Service Status

```bash
sudo supervisorctl status docChat
```

### 7.2 Check Logs

```bash
sudo tail -f /var/log/docChat.log
```

### 7.3 Test API

```bash
curl http://your-ec2-public-ip/health
```

## Step 8: Secure Your Deployment (Optional but Recommended)

### 8.1 Set up UFW Firewall

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### 8.2 Set up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Step 9: Domain Setup (Optional)

### 9.1 Point Domain to EC2

1. Get your EC2 public IP
2. In your domain registrar, create an A record pointing to the IP
3. Update Nginx configuration with your domain name

## Step 10: Monitoring and Maintenance

### 10.1 Set up Log Rotation

```bash
sudo nano /etc/logrotate.d/docChat
```

Add:

```
/var/log/docChat.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 ubuntu ubuntu
}
```

### 10.2 Regular Updates

```bash
# Create update script
nano /opt/docChat/update.sh
```

## Troubleshooting

### Common Issues

1. **Port 8000 not accessible**: Check security group settings
2. **Service won't start**: Check logs with `sudo tail -f /var/log/docChat.log`
3. **Import errors**: Ensure all dependencies are installed in virtual environment
4. **Permission errors**: Check file ownership and permissions

### Useful Commands

```bash
# Check service status
sudo supervisorctl status

# Restart service
sudo supervisorctl restart docChat

# Check nginx status
sudo systemctl status nginx

# Check system resources
htop

# Check disk usage
df -h
```

## Cost Optimization

- Use t2.micro instance (free tier)
- Monitor usage to stay within free tier limits
- Consider stopping instance when not in use
- Use CloudWatch for monitoring

## Next Steps

1. Set up automated backups
2. Implement CI/CD pipeline
3. Add monitoring and alerting
4. Consider using Application Load Balancer for high availability

Your DocChat backend should now be running on EC2! 🚀
