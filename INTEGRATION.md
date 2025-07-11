# Frontend-Backend Integration Guide

This guide explains how to properly link your DocChat frontend and backend components.

## 🔗 Integration Overview

The DocChat application consists of:

- **Frontend**: Next.js application with Supabase auth and UI
- **Backend**: FastAPI server with RAG processing capabilities

## 📋 Prerequisites

Before starting, ensure you have:

1. **API Keys & Services**:

   - Supabase project (URL + Service Role Key + Anon Key)
   - Qdrant Cloud instance (URL + API Key)
   - Hugging Face API key
   - Google Gemini API key

2. **Software**:
   - Python 3.8+
   - Node.js 18+
   - npm or yarn

## 🚀 Quick Setup

### Option 1: Automated Setup

```bash
# Run the quick start script
./quick-start.sh    # Linux/Mac
# or
quick-start.bat     # Windows
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python main.py
```

#### Frontend Setup

```bash
cd frontend/my-app
npm install
# Ensure .env.local has NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
npm run dev
```

## 🔧 Configuration Files

### Backend (.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
QDRANT_URL=https://your-cluster.qdrant.tech
QDRANT_API_KEY=your_qdrant_key
HUGGINGFACE_API_KEY=your_hf_key
GEMINI_API_KEY=your_gemini_key
SECRET_KEY=your_secret_key
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🔄 Data Flow

### Document Upload Flow

1. User uploads file via frontend → Supabase Storage
2. Frontend calls `POST /api/v1/upload_document` with file path
3. Backend downloads file, processes into chunks, generates embeddings
4. Backend stores vectors in Qdrant with user metadata
5. Frontend updates document status to "completed"

### Question Answering Flow

1. User asks question via frontend
2. Frontend calls `POST /api/v1/ask_question` with question + document IDs
3. Backend generates question embedding
4. Backend searches Qdrant for similar chunks
5. Backend sends context + question to Gemini API
6. Backend returns answer + source chunks to frontend

## 🔐 Authentication

The system uses Supabase JWT tokens for authentication:

1. Frontend: Uses Supabase client-side auth
2. Backend: Validates JWT tokens from Authorization header
3. All API calls include `Authorization: Bearer <token>`

## 🧪 Testing the Integration

### 1. Health Check

```bash
curl http://localhost:8000/health
```

### 2. Upload Test

1. Upload a document through the frontend
2. Check backend logs for processing
3. Verify document status changes to "completed"

### 3. Question Test

1. Ask a question in the dashboard
2. Check backend logs for embedding + search + LLM calls
3. Verify response with sources

## 🔍 Debugging

### Backend Issues

- Check `python main.py` output for errors
- Verify all environment variables are set
- Test API endpoints with curl or Postman
- Check Qdrant and Supabase connectivity

### Frontend Issues

- Check browser console for errors
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check network tab for failed API calls
- Ensure Supabase auth is working

### Common Issues

1. **CORS Errors**: Ensure frontend URL is in backend CORS settings
2. **Auth Failures**: Check JWT token in browser dev tools
3. **API Timeouts**: Increase timeout for large document processing
4. **Environment Variables**: Ensure all required vars are set

## 📊 Monitoring

### Backend Status

- Visit `http://localhost:8000/health` for system status
- Check logs for processing errors
- Monitor Qdrant and Supabase dashboards

### Frontend Status

- Backend status component shows connectivity
- Upload page shows processing status
- Dashboard shows document statistics

## 🚀 Production Deployment

### Backend

```bash
# Docker
docker-compose up -d

# Or direct deployment
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
# Update .env.local with production backend URL
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com

# Build and deploy
npm run build
npm start
```

## 🔧 Environment Variables Reference

| Variable                        | Location | Purpose               | Required |
| ------------------------------- | -------- | --------------------- | -------- |
| `SUPABASE_URL`                  | Backend  | Database connection   | ✅       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Backend  | Admin database access | ✅       |
| `QDRANT_URL`                    | Backend  | Vector database       | ✅       |
| `QDRANT_API_KEY`                | Backend  | Vector database auth  | ✅       |
| `HUGGINGFACE_API_KEY`           | Backend  | Embeddings API        | ✅       |
| `GEMINI_API_KEY`                | Backend  | LLM API               | ✅       |
| `NEXT_PUBLIC_BACKEND_URL`       | Frontend | API endpoint          | ✅       |
| `NEXT_PUBLIC_SUPABASE_URL`      | Frontend | Auth & storage        | ✅       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Client auth           | ✅       |

## 🎯 Success Indicators

✅ Backend starts without errors
✅ Frontend connects to backend (green status badge)
✅ Documents upload and process successfully
✅ Questions return relevant answers with sources
✅ Health check returns "healthy" status
✅ No CORS or authentication errors

## 🆘 Support

If you encounter issues:

1. Check this integration guide
2. Review error logs in both frontend and backend
3. Verify all environment variables
4. Test individual components (auth, upload, question)
5. Check API documentation at `http://localhost:8000/docs`
