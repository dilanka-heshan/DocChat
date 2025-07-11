from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from typing import List, Dict, Optional
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "documents")

# Initialize Qdrant client
client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)


async def ensure_collection_exists():
    """
    Ensure the collection exists in Qdrant
    """
    try:
        collections = client.get_collections()
        collection_names = [col.name for col in collections.collections]
        
        if COLLECTION_NAME not in collection_names:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            print(f"Created collection: {COLLECTION_NAME}")
        else:
            print(f"Collection {COLLECTION_NAME} already exists")
    
    except Exception as e:
        raise Exception(f"Failed to ensure collection exists: {str(e)}")


async def store_document_chunks(
    document_id: str,
    user_id: str,
    document_name: str,
    chunks: List[str],
    embeddings: List[List[float]]
) -> int:
    """
    Store document chunks with embeddings in Qdrant
    """
    try:
        await ensure_collection_exists()
        
        points = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid4())
            
            point = PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "document_id": document_id,
                    "user_id": user_id,
                    "document_name": document_name,
                    "chunk_text": chunk,
                    "chunk_index": i,
                    "created_at": datetime.utcnow().isoformat(),
                }
            )
            points.append(point)
        
        # Insert points in batches
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=batch
            )
        
        return len(points)
    
    except Exception as e:
        raise Exception(f"Failed to store document chunks: {str(e)}")


async def search_similar_chunks(
    query_embedding: List[float],
    user_id: str,
    document_ids: Optional[List[str]] = None,
    limit: int = 5
) -> List[Dict]:
    """
    Search for similar chunks in Qdrant
    """
    try:
        # Build filter
        filter_conditions = [
            FieldCondition(key="user_id", match=MatchValue(value=user_id))
        ]
        
        if document_ids:
            # Filter by specific documents
            filter_conditions.append(
                FieldCondition(key="document_id", match=MatchValue(value=document_ids))
            )
        
        search_filter = Filter(must=filter_conditions)
        
        # Search
        search_result = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            query_filter=search_filter,
            limit=limit,
            with_payload=True
        )
        
        # Format results
        results = []
        for point in search_result:
            results.append({
                "id": point.id,
                "score": point.score,
                "document_id": point.payload["document_id"],
                "document_name": point.payload["document_name"],
                "text": point.payload["chunk_text"],
                "chunk_index": point.payload["chunk_index"]
            })
        
        return results
    
    except Exception as e:
        raise Exception(f"Failed to search similar chunks: {str(e)}")


async def delete_document_vectors(document_id: str, user_id: str) -> int:
    """
    Delete all vectors for a specific document
    """
    try:
        # Search for all points with this document_id and user_id
        search_filter = Filter(
            must=[
                FieldCondition(key="document_id", match=MatchValue(value=document_id)),
                FieldCondition(key="user_id", match=MatchValue(value=user_id))
            ]
        )
        
        # Get all points for this document
        search_result = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=search_filter,
            limit=10000,  # Large limit to get all points
            with_payload=False
        )
        
        point_ids = [point.id for point in search_result[0]]
        
        if point_ids:
            # Delete points
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=point_ids
            )
        
        return len(point_ids)
    
    except Exception as e:
        raise Exception(f"Failed to delete document vectors: {str(e)}")


async def get_collection_info() -> Dict:
    """
    Get information about the collection
    """
    try:
        info = client.get_collection(collection_name=COLLECTION_NAME)
        return {
            "name": COLLECTION_NAME,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status
        }
    except Exception as e:
        return {"error": str(e)}


async def delete_old_vectors(days_old: int = 3) -> int:
    """
    Delete vectors older than specified days
    """
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = (datetime.utcnow() - timedelta(days=days_old)).isoformat()
        
        # This is a simplified approach - in production, you might want to 
        # implement a more sophisticated cleanup strategy
        search_result = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=10000,
            with_payload=True
        )
        
        old_point_ids = []
        for point in search_result[0]:
            created_at = point.payload.get("created_at")
            if created_at and created_at < cutoff_date:
                old_point_ids.append(point.id)
        
        if old_point_ids:
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=old_point_ids
            )
        
        return len(old_point_ids)
    
    except Exception as e:
        raise Exception(f"Failed to delete old vectors: {str(e)}")
