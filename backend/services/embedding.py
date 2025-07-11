import requests
import asyncio
from typing import List
from tenacity import retry, stop_after_attempt, wait_exponential
import os
from dotenv import load_dotenv

load_dotenv()

HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
HF_API_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{EMBEDDING_MODEL}"

headers = {
    "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
    "Content-Type": "application/json"
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Get embeddings for a list of texts using Hugging Face Inference API
    """
    if not texts:
        return []
    
    try:
        # Make request to Hugging Face API
        response = requests.post(
            HF_API_URL,
            headers=headers,
            json={
                "inputs": texts,
                "options": {"wait_for_model": True}
            },
            timeout=30
        )
        
        if response.status_code == 200:
            embeddings = response.json()
            
            # Handle different response formats
            if isinstance(embeddings, list) and len(embeddings) > 0:
                # If single text, wrap in list
                if isinstance(embeddings[0], (int, float)):
                    return [embeddings]
                # If multiple texts
                return embeddings
            else:
                raise Exception(f"Unexpected response format: {embeddings}")
        
        elif response.status_code == 503:
            # Model is loading, wait and retry
            await asyncio.sleep(20)
            raise Exception("Model is loading, retrying...")
        
        else:
            raise Exception(f"HF API error: {response.status_code} - {response.text}")
    
    except requests.exceptions.RequestException as e:
        raise Exception(f"Request failed: {str(e)}")
    except Exception as e:
        raise Exception(f"Embedding generation failed: {str(e)}")


async def get_single_embedding(text: str) -> List[float]:
    """
    Get embedding for a single text
    """
    embeddings = await get_embeddings([text])
    return embeddings[0] if embeddings else []


async def get_batch_embeddings(texts: List[str], batch_size: int = 10) -> List[List[float]]:
    """
    Get embeddings for a large list of texts in batches
    """
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_embeddings = await get_embeddings(batch)
        all_embeddings.extend(batch_embeddings)
        
        # Small delay between batches to respect rate limits
        if i + batch_size < len(texts):
            await asyncio.sleep(1)
    
    return all_embeddings
