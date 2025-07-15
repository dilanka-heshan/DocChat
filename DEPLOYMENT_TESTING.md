# DocChat Deployment Verification Guide

## 🚀 Quick Tests to Verify Your Deployment

### 1. **Automated Testing Scripts**

I've created two testing scripts for you:

#### For Windows (PowerShell):

```powershell
.\test-deployment.ps1 -EC2_HOST "your-ec2-public-ip" -EC2_KEY_PATH "path\to\your\ec2-key.pem"
```

#### For Linux/Mac (Bash):

```bash
chmod +x test-deployment.sh
./test-deployment.sh your-ec2-public-ip path/to/your/ec2-key.pem
```

### 2. **Manual Testing Methods**

#### A. **Test API Endpoints Directly**

Replace `YOUR_EC2_IP` with your actual EC2 public IP address:

1. **Health Check**:

   ```
   http://YOUR_EC2_IP:8000/health
   ```

   Should return: `{"status": "healthy"}`

2. **API Documentation**:

   ```
   http://YOUR_EC2_IP:8000/docs
   ```

   Interactive Swagger UI for testing endpoints

3. **Alternative API Docs**:
   ```
   http://YOUR_EC2_IP:8000/redoc
   ```
   ReDoc documentation interface

#### B. **Test Core Functionality**

1. **Upload a Document**:

   - Go to `http://YOUR_EC2_IP:8000/docs`
   - Find the `/upload` endpoint
   - Upload a PDF or text file
   - Should return document ID and success message

2. **Query Documents**:

   - Use the `/ask` endpoint
   - Provide a question about your uploaded document
   - Should return an AI-generated answer

3. **List Documents**:
   - Use the `/documents` endpoint
   - Should return list of uploaded documents

#### C. **Check Service Status via SSH**

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Check service status
sudo systemctl status docchat

# View logs
sudo journalctl -u docchat -f

# Check if port is open
sudo ss -tulpn | grep :8000
```

### 3. **Security Group Configuration**

⚠️ **Important**: Make sure your EC2 Security Group allows:

- **Inbound Rule**: Port 8000, Protocol TCP, Source: Your IP or 0.0.0.0/0 (for testing)

### 4. **Frontend Integration**

If you have the frontend deployed, update your frontend configuration to point to:

```
http://YOUR_EC2_IP:8000
```

### 5. **Environment Variables Check**

SSH into your EC2 and verify environment variables:

```bash
cd /opt/docChat
cat .env
```

Should contain:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- QDRANT_URL
- QDRANT_API_KEY
- HUGGINGFACE_API_KEY
- GEMINI_API_KEY

### 6. **Troubleshooting**

If something isn't working:

1. **Check logs**:

   ```bash
   sudo journalctl -u docchat --no-pager -n 50
   ```

2. **Restart service**:

   ```bash
   sudo systemctl restart docchat
   ```

3. **Check dependencies**:

   ```bash
   cd /opt/docChat
   source venv/bin/activate
   pip list
   ```

4. **Test local connectivity**:
   ```bash
   curl http://localhost:8000/health
   ```

### 7. **Performance Testing**

Use these curl commands to test response times:

```bash
# Health check timing
curl -w "Total time: %{time_total}s\n" -o /dev/null -s http://YOUR_EC2_IP:8000/health

# Upload test (replace with actual file)
curl -w "Upload time: %{time_total}s\n" -X POST -F "file=@test.pdf" http://YOUR_EC2_IP:8000/upload

# Query test
curl -w "Query time: %{time_total}s\n" -X POST -H "Content-Type: application/json" -d '{"query":"test question","document_ids":["doc-id"]}' http://YOUR_EC2_IP:8000/ask
```

---

## 🎉 Success Indicators

Your deployment is working correctly if:

- ✅ Health endpoint returns 200 status
- ✅ API documentation is accessible
- ✅ Service status shows "active (running)"
- ✅ Port 8000 is listening
- ✅ Can upload documents successfully
- ✅ Can query documents and get responses
- ✅ No errors in application logs
