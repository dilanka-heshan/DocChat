from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from datetime import datetime
import uvicorn

# Import route modules
from routes.upload import router as upload_router
from routes.ask import router as ask_router
from routes.documents import router as documents_router

# Import services for initialization
from services.qdrant import ensure_collection_exists, delete_old_vectors, get_collection_info
from services.supabase import cleanup_old_documents
from models.response_models import HealthResponse, APIResponse

# Load environment variables
load_dotenv()

# Scheduler for cleanup tasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


async def cleanup_task():
    """
    Scheduled cleanup task for old documents and vectors
    """
    try:
        print("Starting cleanup task...")
        
        # Cleanup old documents from Supabase
        deleted_docs = await cleanup_old_documents(days_old=3)
        print(f"Deleted {deleted_docs} old documents from database")
        
        # Cleanup old vectors from Qdrant
        deleted_vectors = await delete_old_vectors(days_old=3)
        print(f"Deleted {deleted_vectors} old vectors from Qdrant")
        
        print("Cleanup task completed successfully")
    
    except Exception as e:
        print(f"Cleanup task failed: {str(e)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown tasks
    """
    # Startup
    print("Starting DocChat RAG Backend...")
    
    try:
        # Initialize Qdrant collection
        await ensure_collection_exists()
        print("Qdrant collection initialized")
        
        # Start scheduler for cleanup tasks
        scheduler.add_job(
            cleanup_task,
            CronTrigger(hour=2, minute=0),  # Run daily at 2:00 AM
            id="cleanup_task",
            replace_existing=True
        )
        scheduler.start()
        print("Cleanup scheduler started")
        
    except Exception as e:
        print(f"Startup error: {str(e)}")
    
    yield
    
    # Shutdown
    print("Shutting down DocChat RAG Backend...")
    try:
        scheduler.shutdown()
        print("Scheduler stopped")
    except Exception as e:
        print(f"Shutdown error: {str(e)}")


# Initialize FastAPI app
app = FastAPI(
    title=os.getenv("APP_NAME", "DocChat RAG Backend"),
    description="A production-ready FastAPI backend for document-based RAG system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://doc-chat-lyart.vercel.app",
        "https://doc-chat-bhdilanka-gmailcoms-projects.vercel.app",
        "https://doc-chat-git-main-bhdilanka-gmailcoms-projects.vercel.app",
        "localhost:3000",  # Local development
        "http://localhost:3000",  # Local development with HTTP
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload_router, prefix="/api/v1", tags=["Upload"])
app.include_router(ask_router, prefix="/api/v1", tags=["Questions"])
app.include_router(documents_router, prefix="/api/v1", tags=["Documents"])


@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "message": "DocChat RAG Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    """
    try:
        # Check Qdrant connection
        qdrant_status = "healthy"
        qdrant_info = {}
        try:
            qdrant_info = await get_collection_info()
            if "error" in qdrant_info:
                qdrant_status = "unhealthy"
        except Exception as e:
            qdrant_status = f"unhealthy: {str(e)}"
        
        # Check environment variables
        required_env_vars = [
            "SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "QDRANT_URL",
            "QDRANT_API_KEY",
            "HUGGINGFACE_API_KEY",
            "GEMINI_API_KEY"
        ]
        
        missing_env_vars = [var for var in required_env_vars if not os.getenv(var)]
        env_status = "healthy" if not missing_env_vars else f"missing: {', '.join(missing_env_vars)}"
        
        overall_status = "healthy" if qdrant_status == "healthy" and env_status == "healthy" else "unhealthy"
        
        return HealthResponse(
            status=overall_status,
            timestamp=datetime.utcnow(),
            services={
                "qdrant": {
                    "status": qdrant_status,
                    "info": qdrant_info
                },
                "environment": {
                    "status": env_status
                },
                "scheduler": {
                    "status": "running" if scheduler.running else "stopped",
                    "jobs": len(scheduler.get_jobs())
                }
            }
        )
    
    except Exception as e:
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            services={"error": str(e)}
        )


@app.post("/api/v1/cleanup", response_model=APIResponse)
async def manual_cleanup():
    """
    Manually trigger cleanup task
    """
    try:
        await cleanup_task()
        return APIResponse(
            success=True,
            message="Manual cleanup completed successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message="Manual cleanup failed",
            error=str(e)
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Global HTTP exception handler
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error": exc.detail
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    Global exception handler for unhandled exceptions
    """
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": str(exc) if os.getenv("DEBUG") == "True" else "Internal server error"
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("DEBUG", "False").lower() == "true"
    )
