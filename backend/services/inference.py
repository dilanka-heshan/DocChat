import google.generativeai as genai
from typing import List, Dict
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash-8b')


async def generate_answer(question: str, context_chunks: List[Dict]) -> str:
    """
    Generate answer using Gemini API with context chunks
    """
    try:
        # Format context
        context_text = "\n\n".join([
            f"Source: {chunk['document_name']}\nContent: {chunk['text']}"
            for chunk in context_chunks
        ])
        
        # Create prompt
        prompt = f"""Context:
{context_text}

Question: {question}

Based on the provided context, please answer the question. If the answer cannot be found in the context, please say so. Be specific and cite relevant information from the sources when possible."""

        # Generate response
        response = model.generate_content(prompt)
        
        if response.text:
            return response.text.strip()
        else:
            return "I couldn't generate an answer based on the provided context."
    
    except Exception as e:
        raise Exception(f"Failed to generate answer: {str(e)}")


async def generate_document_summary(text: str, max_length: int = 200) -> str:
    """
    Generate a summary of a document using Gemini API
    """
    try:
        prompt = f"""Please provide a concise summary of the following text in no more than {max_length} words:

{text[:3000]}  # Limit input to avoid token limits

Summary:"""

        response = model.generate_content(prompt)
        
        if response.text:
            return response.text.strip()
        else:
            return "Summary could not be generated."
    
    except Exception as e:
        raise Exception(f"Failed to generate summary: {str(e)}")


async def extract_keywords(text: str) -> List[str]:
    """
    Extract key topics/keywords from text using Gemini API
    """
    try:
        prompt = f"""Extract 5-10 key topics or keywords from the following text. Return them as a comma-separated list:

{text[:2000]}

Keywords:"""

        response = model.generate_content(prompt)
        
        if response.text:
            keywords = [kw.strip() for kw in response.text.strip().split(',')]
            return keywords[:10]  # Limit to 10 keywords
        else:
            return []
    
    except Exception as e:
        return []  # Return empty list on error, not critical functionality
