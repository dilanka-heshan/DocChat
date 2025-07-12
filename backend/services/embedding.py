# import httpx
# import asyncio
# from typing import List
# from tenacity import retry, stop_after_attempt, wait_exponential
# import os
# from dotenv import load_dotenv

# load_dotenv()

# HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
# EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# HF_API_URL = f"https://api-inference.huggingface.co/models/{EMBEDDING_MODEL}"

# headers = {
#     "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
#     "Content-Type": "application/json"
# }


# @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
# async def get_embeddings(texts: List[str]) -> List[List[float]]:
#     """
#     Get embeddings for a list of texts using Hugging Face Inference API
#     """
#     if not texts:
#         return []
    
#     try:
#         async with httpx.AsyncClient() as client:
#             # Make request to Hugging Face API
#             response = await client.post(
#                 HF_API_URL,
#                 headers=headers,
#                 json={
#                     "inputs": texts,
#                     "options": {"wait_for_model": True}
#                 },
#                 timeout=30.0
#             )
        
#         if response.status_code == 200:
#             embeddings = response.json()
            
#             # Handle different response formats
#             if isinstance(embeddings, list) and len(embeddings) > 0:
#                 # If single text, wrap in list
#                 if isinstance(embeddings[0], (int, float)):
#                     return [embeddings]
#                 # If multiple texts
#                 return embeddings
#             else:
#                 raise Exception(f"Unexpected response format: {embeddings}")
        
#         elif response.status_code == 503:
#             # Model is loading, wait and retry
#             await asyncio.sleep(20)
#             raise Exception("Model is loading, retrying...")
        
#         else:
#             raise Exception(f"HF API error: {response.status_code} - {response.text}")
    
#     except httpx.RequestError as e:
#         raise Exception(f"Request failed: {str(e)}")
#     except Exception as e:
#         raise Exception(f"Embedding generation failed: {str(e)}")


# async def get_single_embedding(text: str) -> List[float]:
#     """
#     Get embedding for a single text
#     """
#     embeddings = await get_embeddings([text])
#     return embeddings[0] if embeddings else []


# async def get_batch_embeddings(texts: List[str], batch_size: int = 10) -> List[List[float]]:
#     """
#     Get embeddings for a large list of texts in batches
#     """
#     all_embeddings = []
    
#     for i in range(0, len(texts), batch_size):
#         batch = texts[i:i + batch_size]
#         batch_embeddings = await get_embeddings(batch)
#         all_embeddings.extend(batch_embeddings)
        
#         # Small delay between batches to respect rate limits
#         if i + batch_size < len(texts):
#             await asyncio.sleep(1)
    
#     return all_embeddings

import httpx
import asyncio
from typing import List
from tenacity import retry, stop_after_attempt, wait_exponential
import os
from dotenv import load_dotenv
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"  # This model works better with HF API
HF_API_URL = f"https://api-inference.huggingface.co/models/{EMBEDDING_MODEL}"

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
        async with httpx.AsyncClient() as client:
            # For sentence-transformers models, we need to send each text individually
            all_embeddings = []
            
            for text in texts:
                # Make request to Hugging Face API
                response = await client.post(
                    HF_API_URL,
                    headers=headers,
                    json={"inputs": text},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    embedding = response.json()
                    
                    # Handle different response formats
                    if isinstance(embedding, list) and len(embedding) > 0:
                        # If it's already a flat list of numbers, use it directly
                        if isinstance(embedding[0], (int, float)):
                            all_embeddings.append(embedding)
                        # If it's nested, take the first one
                        else:
                            all_embeddings.append(embedding[0] if embedding[0] else [])
                    else:
                        raise Exception(f"Unexpected response format: {embedding}")
                
                elif response.status_code == 503:
                    # Model is loading, wait and retry
                    await asyncio.sleep(20)
                    raise Exception("Model is loading, retrying...")
                
                else:
                    raise Exception(f"HF API error: {response.status_code} - {response.text}")
                
                # Small delay between requests to respect rate limits
                if len(texts) > 1:
                    await asyncio.sleep(0.1)
            
            return all_embeddings
    
    except httpx.RequestError as e:
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


def calculate_similarity(embeddings: List[List[float]]) -> np.ndarray:
    """
    Calculate cosine similarity matrix for embeddings
    Similar to model.similarity() in sentence-transformers
    """
    embeddings_array = np.array(embeddings)
    return cosine_similarity(embeddings_array)


def find_most_similar(query_embedding: List[float], 
                     candidate_embeddings: List[List[float]], 
                     top_k: int = 5) -> List[tuple]:
    """
    Find most similar embeddings to a query embedding
    Returns list of (index, similarity_score) tuples
    """
    query_array = np.array(query_embedding).reshape(1, -1)
    candidates_array = np.array(candidate_embeddings)
    
    similarities = cosine_similarity(query_array, candidates_array)[0]
    
    # Get top k indices and scores
    top_indices = np.argsort(similarities)[::-1][:top_k]
    return [(int(idx), float(similarities[idx])) for idx in top_indices]


async def main():
    """
    Main function - equivalent to the sentence-transformers example
    """
    # Same sentences as in the HF example
    sentences = [
        "That is a happy person",
        "That is a happy dog",
        "That is a very happy person",
        "Today is a sunny day"
    ]
    
    print("Getting embeddings from Hugging Face API...")
    try:
        # Get embeddings (equivalent to model.encode(sentences))
        embeddings = await get_embeddings(sentences)
        print(f"✓ Successfully got {len(embeddings)} embeddings")
        print(f"✓ Each embedding has {len(embeddings[0])} dimensions")
        
        # Calculate similarities (equivalent to model.similarity(embeddings, embeddings))
        similarities = calculate_similarity(embeddings)
        print(f"✓ Similarity matrix shape: {similarities.shape}")  # Should be [4, 4]
        
        # Print the similarity matrix
        print("\nSimilarity Matrix:")
        print(similarities)
        
        # Show detailed similarities
        print("\nDetailed Similarities:")
        for i, sentence1 in enumerate(sentences):
            print(f"\n'{sentence1}':")
            for j, sentence2 in enumerate(sentences):
                if i != j:  # Skip self-similarity
                    print(f"  vs '{sentence2}': {similarities[i][j]:.4f}")
        
        # Find most similar to first sentence
        print(f"\nMost similar to '{sentences[0]}':")
        most_similar = find_most_similar(embeddings[0], embeddings)
        for idx, score in most_similar:
            print(f"  {idx}: '{sentences[idx]}' - {score:.4f}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure you have:")
        print("1. Set HUGGINGFACE_API_KEY in your .env file")
        print("2. Installed required packages: pip install httpx tenacity python-dotenv numpy scikit-learn")


if __name__ == "__main__":
    # This is equivalent to running the sentence-transformers example
    asyncio.run(main())