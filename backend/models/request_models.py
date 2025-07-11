from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class DocumentUploadRequest(BaseModel):
    file_path: str
    document_id: str
    user_id: str


class QuestionRequest(BaseModel):
    question: str
    document_ids: List[str]
    user_id: str


class DocumentMetadata(BaseModel):
    id: str
    user_id: str
    name: str
    file_path: str
    file_type: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentDeleteRequest(BaseModel):
    user_id: str
