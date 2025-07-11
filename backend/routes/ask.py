from fastapi import APIRouter, Depends, HTTPException, status
from models.request_models import QuestionRequest
from models.response_models import APIResponse, QuestionResponse, SourceChunk
from services.embedding import get_single_embedding
from services.qdrant import search_similar_chunks
from services.inference import generate_answer
from services.supabase import get_document_by_ids, create_chat_session, save_message
from utils.auth import get_current_user, verify_user_owns_documents
from typing import List

router = APIRouter()


@router.post("/ask_question", response_model=APIResponse)
async def ask_question(
    request: QuestionRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Answer a question based on selected documents
    """
    try:
        # Verify user owns all specified documents
        if request.document_ids and not verify_user_owns_documents(current_user, request.document_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access one or more specified documents"
            )
        
        # Validate that documents exist and are completed
        if request.document_ids:
            documents = await get_document_by_ids(request.document_ids, current_user)
            
            if len(documents) != len(request.document_ids):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or more documents not found"
                )
            
            # Check if all documents are completed
            incomplete_docs = [doc for doc in documents if doc["status"] != "completed"]
            if incomplete_docs:
                incomplete_names = [doc["name"] for doc in incomplete_docs]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The following documents are not ready: {', '.join(incomplete_names)}"
                )
        
        # Generate embedding for the question
        question_embedding = await get_single_embedding(request.question)
        
        if not question_embedding:
            raise Exception("Failed to generate embedding for the question")
        
        # Search for similar chunks
        similar_chunks = await search_similar_chunks(
            query_embedding=question_embedding,
            user_id=current_user,
            document_ids=request.document_ids,
            limit=5
        )
        
        if not similar_chunks:
            return APIResponse(
                success=True,
                message="No relevant information found",
                data=QuestionResponse(
                    answer="I couldn't find relevant information in the specified documents to answer your question.",
                    sources=[],
                    question=request.question
                )
            )
        
        # Prepare context for LLM
        context_chunks = []
        source_chunks = []
        
        for chunk in similar_chunks:
            context_chunks.append({
                "document_name": chunk["document_name"],
                "text": chunk["text"]
            })
            
            source_chunks.append(SourceChunk(
                document_id=chunk["document_id"],
                document_name=chunk["document_name"],
                chunk_text=chunk["text"][:500] + "..." if len(chunk["text"]) > 500 else chunk["text"],
                score=chunk["score"]
            ))
        
        # Generate answer using LLM
        answer = await generate_answer(request.question, context_chunks)
        
        # Create response
        response_data = QuestionResponse(
            answer=answer,
            sources=source_chunks,
            question=request.question
        )
        
        # Optional: Save conversation to database
        try:
            # Create a simple session title from the question
            session_title = request.question[:50] + "..." if len(request.question) > 50 else request.question
            session_id = await create_chat_session(current_user, session_title)
            
            # Save user question
            await save_message(
                session_id=session_id,
                user_id=current_user,
                content=request.question,
                role="user"
            )
            
            # Save assistant answer with sources
            source_refs = [f"{chunk.document_name}" for chunk in source_chunks]
            await save_message(
                session_id=session_id,
                user_id=current_user,
                content=answer,
                role="assistant",
                sources=source_refs
            )
        except Exception as e:
            # Don't fail the request if chat saving fails
            print(f"Failed to save chat: {str(e)}")
        
        return APIResponse(
            success=True,
            message="Question answered successfully",
            data=response_data
        )
    
    except HTTPException:
        raise
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to answer question",
            error=str(e)
        )


@router.post("/ask_quick", response_model=APIResponse)
async def ask_quick_question(
    question: str,
    current_user: str = Depends(get_current_user)
):
    """
    Quick question across all user's completed documents
    """
    try:
        # Create request with all user documents
        request = QuestionRequest(
            question=question,
            document_ids=[],  # Empty means search across all documents
            user_id=current_user
        )
        
        return await ask_question(request, current_user)
    
    except Exception as e:
        return APIResponse(
            success=False,
            message="Failed to answer quick question",
            error=str(e)
        )
