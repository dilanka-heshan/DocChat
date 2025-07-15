# DocChat Backend - Troubleshooting Guide

## Common Issues and Solutions

### 1. Service Won't Start

**Symptoms:**

- `sudo supervisorctl status docChat` shows FATAL or STOPPED
- Service keeps restarting

**Solutions:**

```bash
# Check detailed logs
sudo tail -f /var/log/docChat.log

# Common fixes:
# 1. Check environment variables
nano /opt/docChat/.env

# 2. Test Python imports
cd /opt/docChat
source venv/bin/activate
python -c "import main"

# 3. Check permissions
sudo chown -R ubuntu:ubuntu /opt/docChat

# 4. Restart supervisor
sudo supervisorctl restart docChat
```

### 2. API Not Accessible from Outside

**Symptoms:**

- Works on localhost but not from external IP
- Connection timeout from browser

**Solutions:**

```bash
# 1. Check security group (AWS Console)
# Allow ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8000 (FastAPI)

# 2. Check if service is binding to correct interface
sudo netstat -tlnp | grep 8000

# 3. Test nginx proxy
sudo nginx -t
sudo systemctl restart nginx

# 4. Check UFW firewall (if enabled)
sudo ufw status
sudo ufw allow 8000
```

### 3. Environment Variables Not Working

**Symptoms:**

- Import errors for API keys
- "API key not found" errors

**Solutions:**

```bash
# 1. Check .env file exists and has correct values
cat /opt/docChat/.env

# 2. Restart service after changing .env
sudo supervisorctl restart docChat

# 3. Test environment loading
cd /opt/docChat
source venv/bin/activate
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print('SUPABASE_URL:', os.getenv('SUPABASE_URL'))"
```

### 4. Memory Issues (t2.micro)

**Symptoms:**

- Service crashes randomly
- Out of memory errors
- Slow response times

**Solutions:**

```bash
# 1. Add swap space
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Reduce worker count
sudo nano /etc/supervisor/conf.d/docChat.conf
# Change: --workers 2 to --workers 1

# 3. Monitor memory usage
htop
free -h
```

### 5. SSL/HTTPS Issues

**Symptoms:**

- Mixed content warnings
- Certificate errors

**Solutions:**

```bash
# 1. Install Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# 2. Get SSL certificate
sudo certbot --nginx -d your-domain.com

# 3. Test renewal
sudo certbot renew --dry-run
```

### 6. File Upload Issues

**Symptoms:**

- Large files fail to upload
- 413 Request Entity Too Large

**Solutions:**

```bash
# 1. Update nginx client_max_body_size
sudo nano /etc/nginx/sites-available/docChat
# Add: client_max_body_size 50M;

# 2. Restart nginx
sudo systemctl restart nginx

# 3. Check disk space
df -h
```

### 7. Database Connection Issues

**Symptoms:**

- Supabase connection errors
- Authentication failures

**Solutions:**

```bash
# 1. Test Supabase connection
cd /opt/docChat
source venv/bin/activate
python -c "
from services.supabase import get_supabase_client
client = get_supabase_client()
print('Connection successful')
"

# 2. Check API keys in Supabase dashboard
# 3. Verify RLS policies are correct
```

### 8. Vector Database Issues

**Symptoms:**

- Qdrant connection errors
- Search not working

**Solutions:**

```bash
# 1. Test Qdrant connection
cd /opt/docChat
source venv/bin/activate
python -c "
from services.qdrant import get_qdrant_client
client = get_qdrant_client()
print('Qdrant connected:', client.get_collections())
"

# 2. Check Qdrant dashboard
# 3. Recreate collection if needed
```

## Diagnostic Commands

```bash
# System health
./deploy/health-check.sh

# Service status
sudo supervisorctl status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/docChat.log
sudo tail -f /var/log/nginx/error.log

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs

# Check network
sudo netstat -tlnp | grep -E "(80|443|8000)"
sudo ufw status

# System resources
htop
df -h
free -h
```

## Performance Tuning for t2.micro

### 1. Optimize Python Settings

```bash
# Add to supervisor config
environment=PYTHONOPTIMIZE=1,PYTHONDONTWRITEBYTECODE=1
```

### 2. Reduce Memory Usage

```bash
# Use single worker
--workers 1

# Reduce buffer sizes in nginx
proxy_buffering off;
```

### 3. Enable Caching

```bash
# Add Redis for caching (if needed)
sudo apt install redis-server
pip install redis
```

## Monitoring Setup

### 1. Log Rotation

```bash
sudo nano /etc/logrotate.d/docChat
```

### 2. Basic Monitoring Script

```bash
#!/bin/bash
# Monitor script - add to crontab
curl -f http://localhost:8000/health || echo "API DOWN $(date)" >> /var/log/api-monitor.log
```

### 3. CloudWatch (Optional)

- Set up CloudWatch agent for detailed monitoring
- Create alarms for high CPU/memory usage

## Security Checklist

- [ ] SSH key-based authentication only
- [ ] UFW firewall configured
- [ ] Regular security updates
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] Backup strategy in place
- [ ] Log monitoring enabled

## Contact and Support

If you continue to have issues:

1. Check the GitHub repository for updates
2. Review AWS documentation for EC2 troubleshooting
3. Check service-specific documentation (Supabase, Qdrant, etc.)
4. Consider upgrading to a larger instance if resource-constrained
