from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

# Initialize Supabase client for auth verification (using anon key)
auth_supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")  # Use anon key for auth verification
)

# Initialize Supabase client for admin operations (using service role key)
admin_supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Extract user_id from JWT token
    """
    try:
        token = credentials.credentials
        
        # Verify token with Supabase using anon key
        response = auth_supabase.auth.get_user(token)
        
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return response.user.id
    
    except Exception as e:
        print(f"Auth error: {str(e)}")  # Add logging for debugging
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_user_owns_document(user_id: str, document_id: str) -> bool:
    """
    Verify that the user owns the specified document
    """
    try:
        response = admin_supabase.table("documents").select("user_id").eq("id", document_id).execute()
        
        if not response.data:
            return False
            
        return response.data[0]["user_id"] == user_id
    
    except Exception:
        return False


def verify_user_owns_documents(user_id: str, document_ids: list) -> bool:
    """
    Verify that the user owns all specified documents
    """
    try:
        response = admin_supabase.table("documents").select("user_id").in_("id", document_ids).execute()
        
        if len(response.data) != len(document_ids):
            return False
            
        return all(doc["user_id"] == user_id for doc in response.data)
    
    except Exception:
        return False
