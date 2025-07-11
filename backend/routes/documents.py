from fastapi import APIRouter, Depends, HTTPException, status, Path
from models.request_models import DocumentDeleteRequest
from models.response_models import APIResponse, DocumentListResponse, DocumentDeleteResponse
from services.supabase import get_user_documents, delete_document_metadata, delete_file_from_storage, get_document_metadata
from services.qdrant import delete_document_vectors
from utils.auth import get_current_user, verify_user_owns_document, verify_user_owns_documents, verify_user_owns_documents
from typing import List

router = APIRouter()


@router.get("/documents", response_model=APIResponse)
async def get_documents(
    current_user: str = Depends(get_current_user),
    status_filter: str = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Get list of user's documents with optional filtering
    """
    try:
        # Get all user documents
        documents = await get_user_documents(current_user)
        
        # Apply status filter if specified
        if status_filter:
            documents = [doc for doc in documents if doc["status"] == status_filter]
        
        # Apply pagination
        total_count = len(documents)
        paginated_docs = documents[offset:offset + limit]
        
        # Format response
        formatted_docs = []
        for doc in paginated_docs:
            formatted_docs.append({
                "id": doc["id"],
                "name": doc["name"],
                "file_type": doc["file_type"],
                "file_size": doc["file_size"],
                "status": doc["status"],
                "error_message": doc.get("error_message"),
                "created_at": doc["created_at"],
                "updated_at": doc["updated_at"]
            })
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(formatted_docs)} documents",
            data=DocumentListResponse(
                documents=formatted_docs,
                total_count=total_count
            )
        )
    
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to retrieve documents",
            error=str(e)
        )


@router.get("/documents/{document_id}", response_model=APIResponse)
async def get_document(
    document_id: str = Path(..., description="Document ID"),
    current_user: str = Depends(get_current_user)
):
    """
    Get detailed information about a specific document
    """
    try:
        # Verify user owns the document
        if not verify_user_owns_document(current_user, document_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this document"
            )
        
        # Get document metadata
        document = await get_document_metadata(document_id, current_user)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        return APIResponse(
            success=True,
            message="Document retrieved successfully",
            data=document
        )
    
    except HTTPException:
        raise
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to retrieve document",
            error=str(e)
        )


@router.delete("/documents/{document_id}", response_model=APIResponse)
async def delete_document(
    document_id: str = Path(..., description="Document ID"),
    current_user: str = Depends(get_current_user)
):
    """
    Delete a document completely (vectors, file, and metadata)
    """
    try:
        # Verify user owns the document
        if not verify_user_owns_document(current_user, document_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this document"
            )
        
        # Get document metadata before deletion
        document = await get_document_metadata(document_id, current_user)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Delete vectors from Qdrant
        deleted_vectors_count = 0
        try:
            deleted_vectors_count = await delete_document_vectors(document_id, current_user)
        except Exception as e:
            print(f"Warning: Failed to delete vectors: {str(e)}")
        
        # Delete file from Supabase storage
        try:
            await delete_file_from_storage(document["file_path"])
        except Exception as e:
            print(f"Warning: Failed to delete file from storage: {str(e)}")
        
        # Delete metadata from database
        await delete_document_metadata(document_id, current_user)
        
        return APIResponse(
            success=True,
            message="Document deleted successfully",
            data=DocumentDeleteResponse(
                deleted_document_id=document_id,
                deleted_vectors_count=deleted_vectors_count,
                message=f"Deleted document '{document['name']}' and {deleted_vectors_count} vectors"
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to delete document",
            error=str(e)
        )


@router.delete("/documents", response_model=APIResponse)
async def delete_multiple_documents(
    document_ids: List[str],
    current_user: str = Depends(get_current_user)
):
    """
    Delete multiple documents at once
    """
    try:
        if not document_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No document IDs provided"
            )
        
        # Verify user owns all documents
        if not verify_user_owns_documents(current_user, document_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete one or more specified documents"
            )
        
        deleted_docs = []
        failed_docs = []
        total_vectors_deleted = 0
        
        for doc_id in document_ids:
            try:
                # Get document info
                document = await get_document_metadata(doc_id, current_user)
                if not document:
                    failed_docs.append({"id": doc_id, "error": "Document not found"})
                    continue
                
                # Delete vectors
                try:
                    vectors_count = await delete_document_vectors(doc_id, current_user)
                    total_vectors_deleted += vectors_count
                except Exception:
                    pass  # Continue with file and metadata deletion
                
                # Delete file
                try:
                    await delete_file_from_storage(document["file_path"])
                except Exception:
                    pass  # Continue with metadata deletion
                
                # Delete metadata
                await delete_document_metadata(doc_id, current_user)
                
                deleted_docs.append({
                    "id": doc_id,
                    "name": document["name"]
                })
            
            except Exception as e:
                failed_docs.append({"id": doc_id, "error": str(e)})
        
        result_message = f"Successfully deleted {len(deleted_docs)} documents"
        if failed_docs:
            result_message += f", failed to delete {len(failed_docs)} documents"
        
        return APIResponse(
            success=len(deleted_docs) > 0,
            message=result_message,
            data={
                "deleted_documents": deleted_docs,
                "failed_documents": failed_docs,
                "total_vectors_deleted": total_vectors_deleted
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to delete documents",
            error=str(e)
        )


@router.get("/documents/stats", response_model=APIResponse)
async def get_document_stats(
    current_user: str = Depends(get_current_user)
):
    """
    Get statistics about user's documents
    """
    try:
        documents = await get_user_documents(current_user)
        
        # Calculate statistics
        total_docs = len(documents)
        status_counts = {}
        total_size = 0
        file_type_counts = {}
        
        for doc in documents:
            # Status counts
            status = doc["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Total size
            total_size += doc["file_size"]
            
            # File type counts
            file_type = doc["file_type"]
            file_type_counts[file_type] = file_type_counts.get(file_type, 0) + 1
        
        stats = {
            "total_documents": total_docs,
            "status_breakdown": status_counts,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_type_breakdown": file_type_counts,
            "completed_documents": status_counts.get("completed", 0),
            "processing_documents": status_counts.get("processing", 0),
            "error_documents": status_counts.get("error", 0)
        }
        
        return APIResponse(
            success=True,
            message="Document statistics retrieved successfully",
            data=stats
        )
    
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to retrieve document statistics",
            error=str(e)
        )
