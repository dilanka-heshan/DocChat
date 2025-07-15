# Frontend-Backend Connection Setup Guide

## 🎯 **Quick Setup Steps**

### **Step 1: Update Backend CORS (Already Done)**

✅ Updated `main.py` to allow Vercel origins
✅ Updated `api.ts` to point to your EC2 backend

### **Step 2: Deploy Backend Changes**

Run this PowerShell command to update your EC2 backend:

```powershell
.\update-backend.ps1 -EC2_HOST "13.48.43.175" -EC2_KEY_PATH "C:\Users\User\Downloads\docChat-backend.pem"
```

### **Step 3: Set Vercel Environment Variables**

1. **Go to your Vercel dashboard** (https://vercel.com/dashboard)
2. **Select your frontend project**
3. **Go to Settings → Environment Variables**
4. **Add these environment variables:**

| Name                            | Value                      | Environment                      |
| ------------------------------- | -------------------------- | -------------------------------- |
| `NEXT_PUBLIC_BACKEND_URL`       | `http://13.48.43.175:8000` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL`      | `your-supabase-url`        | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key`   | Production, Preview, Development |

### **Step 4: Redeploy Frontend**

#### **Option A: Automatic (Recommended)**

```bash
git add .
git commit -m "Update API URL to point to EC2 backend"
git push origin main
```

Vercel will automatically redeploy.

#### **Option B: Manual**

1. Go to your Vercel dashboard
2. Click "Redeploy" on your latest deployment

### **Step 5: Test the Connection**

#### **Quick Browser Test:**

1. Open your Vercel app: `https://your-app.vercel.app`
2. Open Browser Developer Tools (F12)
3. Go to Network tab
4. Try to upload a document or ask a question
5. Check if requests go to `http://13.48.43.175:8000`

#### **Manual API Test:**

```bash
curl -X GET "http://13.48.43.175:8000/health" \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

## 🔧 **Troubleshooting**

### **Problem: CORS Errors**

**Solution:** Make sure backend is updated with new CORS settings:

```powershell
.\update-backend.ps1 -EC2_HOST "13.48.43.175" -EC2_KEY_PATH "C:\Users\User\Downloads\docChat-backend.pem"
```

### **Problem: API calls to localhost**

**Solution:** Make sure environment variable is set correctly in Vercel:

- Variable: `NEXT_PUBLIC_BACKEND_URL`
- Value: `http://13.48.43.175:8000`

### **Problem: 504 Gateway Timeout**

**Solution:** Check EC2 Security Group allows port 8000:

1. AWS Console → EC2 → Security Groups
2. Add Inbound Rule: Type=Custom TCP, Port=8000, Source=0.0.0.0/0

### **Problem: Service not responding**

**Solution:** Restart the backend service:

```bash
ssh -i "C:\Users\User\Downloads\docChat-backend.pem" ubuntu@13.48.43.175
sudo systemctl restart docchat
sudo systemctl status docchat
```

## 🧪 **Testing Checklist**

- [ ] ✅ Backend CORS updated and deployed
- [ ] ✅ Frontend API URL updated to EC2
- [ ] ✅ Vercel environment variables set
- [ ] ✅ Frontend redeployed
- [ ] ✅ EC2 Security Group allows port 8000
- [ ] ✅ Backend service running
- [ ] ✅ Health endpoint accessible: `http://13.48.43.175:8000/health`
- [ ] ✅ Frontend can make API calls to backend

## 🎉 **Success Indicators**

Your connection is working when:

1. **Frontend loads without errors**
2. **API calls visible in Network tab going to EC2**
3. **Document upload works**
4. **Questions return answers**
5. **No CORS errors in browser console**

## 📱 **Your URLs**

- **Backend API:** `http://13.48.43.175:8000`
- **API Docs:** `http://13.48.43.175:8000/docs`
- **Health Check:** `http://13.48.43.175:8000/health`
- **Frontend:** `https://your-app.vercel.app` (replace with actual URL)

## 🔒 **Security Notes**

- Currently using HTTP for backend (okay for testing)
- CORS set to allow all origins (temporary for testing)
- For production, consider:
  - Setting up HTTPS with SSL certificate
  - Restricting CORS to specific Vercel domains
  - Using environment-specific configurations
