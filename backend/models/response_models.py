from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    document_id: str
    status: str
    message: str


class SourceChunk(BaseModel):
    document_id: str
    document_name: str
    chunk_text: str
    score: float


class QuestionResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    question: str


class DocumentListResponse(BaseModel):
    documents: List[dict]
    total_count: int


class DocumentDeleteResponse(BaseModel):
    deleted_document_id: str
    deleted_vectors_count: int
    message: str


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    services: dict
