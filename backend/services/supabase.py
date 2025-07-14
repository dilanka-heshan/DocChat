from supabase import create_client, Client
import os
import aiofiles
import tempfile
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


async def get_document_metadata(document_id: str, user_id: str) -> Optional[Dict]:
    """
    Get document metadata from Supabase
    """
    try:
        response = supabase.table("documents").select("*").eq("id", document_id).eq("user_id", user_id).execute()
        
        if response.data:
            return response.data[0]
        return None
    
    except Exception as e:
        raise Exception(f"Failed to get document metadata: {str(e)}")


async def get_user_documents(user_id: str) -> List[Dict]:
    """
    Get all documents for a user
    """
    try:
        response = supabase.table("documents").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        return response.data or []
    
    except Exception as e:
        raise Exception(f"Failed to get user documents: {str(e)}")


async def update_document_status(document_id: str, status: str, error_message: Optional[str] = None):
    """
    Update document processing status
    """
    try:
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        if error_message:
            update_data["error_message"] = error_message
        
        supabase.table("documents").update(update_data).eq("id", document_id).execute()
    
    except Exception as e:
        raise Exception(f"Failed to update document status: {str(e)}")


async def delete_document_metadata(document_id: str, user_id: str):
    """
    Delete document metadata from Supabase database
    """
    try:
        response = supabase.table("documents").delete().eq("id", document_id).eq("user_id", user_id).execute()
        return response
    except Exception as e:
        raise Exception(f"Failed to delete document metadata: {str(e)}")


async def download_file_from_storage(file_path: str) -> str:
    """
    Download file from Supabase storage to a temporary location
    """
    try:
        print(f"Attempting to download file from storage: {file_path}")
        
        # Get signed URL
        response = supabase.storage.from_("documents").create_signed_url(file_path, 3600)  # 1 hour expiry
        
        if not response.get("signedURL"):
            print(f"Failed to create signed URL for: {file_path}")
            print(f"Response: {response}")
            raise Exception("Failed to create signed URL")
        
        signed_url = response["signedURL"]
        print(f"Created signed URL: {signed_url}")
        
        # Download file
        import requests
        print(f"Downloading file from signed URL...")
        file_response = requests.get(signed_url, timeout=60)
        file_response.raise_for_status()
        
        if len(file_response.content) == 0:
            raise Exception("Downloaded file is empty")
        
        print(f"Downloaded file size: {len(file_response.content)} bytes")
        
        # Save to temporary file
        file_extension = os.path.splitext(file_path)[1]
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        
        with open(temp_file.name, 'wb') as f:
            f.write(file_response.content)
        
        print(f"Saved temporary file: {temp_file.name}")
        return temp_file.name
    
    except Exception as e:
        print(f"Error downloading file from storage: {str(e)}")
        raise Exception(f"Failed to download file from storage: {str(e)}")


async def delete_file_from_storage(file_path: str):
    """
    Delete file from Supabase storage
    """
    try:
        # Remove the file from the documents bucket
        response = supabase.storage.from_("documents").remove([file_path])
        return response
    except Exception as e:
        raise Exception(f"Failed to delete file from storage: {str(e)}")


async def cleanup_old_documents(days_old: int = 3) -> int:
    """
    Delete documents older than specified days
    """
    try:
        cutoff_date = (datetime.utcnow() - timedelta(days=days_old)).isoformat()
        
        # Get old documents
        response = supabase.table("documents").select("*").lt("created_at", cutoff_date).execute()
        
        old_documents = response.data or []
        deleted_count = 0
        
        for doc in old_documents:
            try:
                # Delete from storage
                await delete_file_from_storage(doc["file_path"])
                
                # Delete metadata
                await delete_document_metadata(doc["id"], doc["user_id"])
                
                deleted_count += 1
            
            except Exception as e:
                print(f"Failed to delete document {doc['id']}: {str(e)}")
                continue
        
        return deleted_count
    
    except Exception as e:
        raise Exception(f"Failed to cleanup old documents: {str(e)}")


async def get_document_by_ids(document_ids: List[str], user_id: str) -> List[Dict]:
    """
    Get multiple documents by their IDs for a specific user
    """
    try:
        response = supabase.table("documents").select("*").in_("id", document_ids).eq("user_id", user_id).execute()
        
        return response.data or []
    
    except Exception as e:
        raise Exception(f"Failed to get documents by IDs: {str(e)}")


async def create_chat_session(user_id: str, title: str) -> str:
    """
    Create a new chat session
    """
    try:
        response = supabase.table("chat_sessions").insert({
            "user_id": user_id,
            "title": title,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        
        if response.data:
            return response.data[0]["id"]
        else:
            raise Exception("Failed to create chat session")
    
    except Exception as e:
        raise Exception(f"Failed to create chat session: {str(e)}")


async def save_message(session_id: str, user_id: str, content: str, role: str, sources: Optional[List[str]] = None):
    """
    Save a chat message
    """
    try:
        supabase.table("messages").insert({
            "session_id": session_id,
            "user_id": user_id,
            "content": content,
            "role": role,
            "sources": sources,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    
    except Exception as e:
        raise Exception(f"Failed to save message: {str(e)}")
