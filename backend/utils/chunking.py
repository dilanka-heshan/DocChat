import PyPDF2
import docx
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))


def extract_text_from_file(file_path: str, file_type: str) -> str:
    """
    Extract text from different file types
    """
    text = ""
    
    try:
        if file_type.lower() == "pdf":
            text = extract_text_from_pdf(file_path)
        elif file_type.lower() == "docx":
            text = extract_text_from_docx(file_path)
        elif file_type.lower() == "txt":
            text = extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
            
    except Exception as e:
        raise Exception(f"Error extracting text from {file_type} file: {str(e)}")
    
    return text


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    text = ""
    
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    
    return text


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file"""
    doc = docx.Document(file_path)
    text = ""
    
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    
    return text


def extract_text_from_txt(file_path: str) -> str:
    """Extract text from TXT file"""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()


def chunk_text(text: str) -> List[str]:
    """
    Split text into chunks using RecursiveCharacterTextSplitter
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = text_splitter.split_text(text)
    
    # Filter out very short chunks
    chunks = [chunk for chunk in chunks if len(chunk.strip()) > 50]
    
    return chunks


def process_document(file_path: str, file_type: str) -> List[str]:
    """
    Process a document: extract text and split into chunks
    """
    # Extract text from file
    text = extract_text_from_file(file_path, file_type)
    
    if not text.strip():
        raise ValueError("No text could be extracted from the document")
    
    # Split into chunks
    chunks = chunk_text(text)
    
    if not chunks:
        raise ValueError("No valid chunks could be created from the document")
    
    return chunks
