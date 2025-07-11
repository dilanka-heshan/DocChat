# Backend API for DocChat RAG System

This is a production-ready FastAPI backend for a document-based Retrieval-Augmented Generation (RAG) system.

## Features

- 📄 **Document Processing**: Upload and process PDF, DOCX, and TXT files
- 🧠 **Smart Chunking**: Intelligent text splitting using LangChain
- 🔍 **Vector Search**: Qdrant vector database for semantic search
- 🤖 **AI Responses**: Gemini API for generating contextual answers
- 🔐 **Secure Auth**: Supabase authentication integration
- 📊 **Document Management**: Full CRUD operations for documents
- 🧹 **Auto Cleanup**: Scheduled cleanup of old documents and vectors

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `QDRANT_URL`: Qdrant cloud URL
- `QDRANT_API_KEY`: Qdrant API key
- `HUGGINGFACE_API_KEY`: Hugging Face API key
- `GEMINI_API_KEY`: Google Gemini API key

### 3. Database Setup

Ensure your Supabase database has the required tables:

```sql
-- Documents table
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploading',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL,
    sources TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Storage Setup

Create a Supabase storage bucket named `documents` with appropriate policies.

## Running the Application

### Development

```bash
python main.py
```

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Document Upload

- `POST /api/v1/upload_document` - Process uploaded document
- `POST /api/v1/reprocess_document/{document_id}` - Reprocess failed document

### Questions & Answers

- `POST /api/v1/ask_question` - Ask question about specific documents
- `POST /api/v1/ask_quick` - Quick question across all documents

### Document Management

- `GET /api/v1/documents` - List user's documents
- `GET /api/v1/documents/{document_id}` - Get document details
- `DELETE /api/v1/documents/{document_id}` - Delete document
- `DELETE /api/v1/documents` - Delete multiple documents
- `GET /api/v1/documents/stats` - Get document statistics

### System

- `GET /health` - Health check
- `POST /api/v1/cleanup` - Manual cleanup trigger

## Architecture

```
Frontend (Next.js) → FastAPI Backend → Services
                                    ├── Supabase (Auth, DB, Storage)
                                    ├── Qdrant (Vector DB)
                                    ├── Hugging Face (Embeddings)
                                    └── Gemini (LLM Responses)
```

## Authentication

The API uses JWT tokens from Supabase. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Rate Limits & Considerations

- Hugging Face API: Respect rate limits with retry logic
- File size limit: 10MB per document
- Chunk size: 1000 characters with 200 overlap
- Auto cleanup: Runs daily at 2:00 AM
- Vector search: Top-5 results for context

## Error Handling

All endpoints return standardized responses:

```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "error": string | null
}
```

## Development Notes

- Use async/await for all I/O operations
- Implement proper error handling and logging
- Validate user permissions for all document operations
- Clean up temporary files after processing
- Monitor API usage and costs
