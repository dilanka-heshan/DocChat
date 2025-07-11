from fastapi import APIRouter, Depends, HTTPException, status
from models.request_models import DocumentUploadRequest
from models.response_models import APIResponse, DocumentUploadResponse
from services.supabase import get_document_metadata, update_document_status, download_file_from_storage
from services.embedding import get_batch_embeddings
from services.qdrant import store_document_chunks
from utils.chunking import process_document
from utils.auth import get_current_user, verify_user_owns_document
import os
import asyncio

router = APIRouter()


@router.post("/upload_document", response_model=APIResponse)
async def upload_document(
    request: DocumentUploadRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Process uploaded document: download, chunk, embed, and store in Qdrant
    """
    try:
        # Verify user owns the document
        if not verify_user_owns_document(current_user, request.document_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this document"
            )
        
        # Get document metadata
        doc_metadata = await get_document_metadata(request.document_id, current_user)
        if not doc_metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Update status to processing
        await update_document_status(request.document_id, "processing")
        
        # Download file from Supabase storage
        temp_file_path = await download_file_from_storage(request.file_path)
        
        try:
            # Process document (extract text and chunk)
            file_extension = doc_metadata["file_type"].lower()
            chunks = process_document(temp_file_path, file_extension)
            
            if not chunks:
                raise Exception("No text chunks could be extracted from the document")
            
            # Generate embeddings for chunks
            embeddings = await get_batch_embeddings(chunks)
            
            if len(embeddings) != len(chunks):
                raise Exception("Mismatch between number of chunks and embeddings")
            
            # Store chunks and embeddings in Qdrant
            stored_count = await store_document_chunks(
                document_id=request.document_id,
                user_id=current_user,
                document_name=doc_metadata["name"],
                chunks=chunks,
                embeddings=embeddings
            )
            
            # Update document status to completed
            await update_document_status(request.document_id, "completed")
            
            return APIResponse(
                success=True,
                message=f"Document processed successfully. {stored_count} chunks stored.",
                data=DocumentUploadResponse(
                    document_id=request.document_id,
                    status="completed",
                    message=f"Successfully processed {len(chunks)} chunks"
                )
            )
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except HTTPException:
        raise
    except Exception as e:
        # Update document status to error
        try:
            await update_document_status(request.document_id, "error", str(e))
        except:
            pass
        
        return APIResponse(
            success=False,
            message="Failed to process document",
            error=str(e)
        )


@router.post("/reprocess_document/{document_id}", response_model=APIResponse)
async def reprocess_document(
    document_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Reprocess a document that failed or needs reprocessing
    """
    try:
        # Verify user owns the document
        if not verify_user_owns_document(current_user, document_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this document"
            )
        
        # Get document metadata
        doc_metadata = await get_document_metadata(document_id, current_user)
        if not doc_metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Create upload request and process
        upload_request = DocumentUploadRequest(
            file_path=doc_metadata["file_path"],
            document_id=document_id,
            user_id=current_user
        )
        
        return await upload_document(upload_request, current_user)
    
    except HTTPException:
        raise
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to reprocess document",
            error=str(e)
        )
