import pytest
import asyncio
from httpx import AsyncClient
from main import app


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_root_endpoint(client):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "DocChat RAG Backend API"


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "services" in data


@pytest.mark.asyncio
async def test_upload_document_unauthorized(client):
    response = await client.post("/api/v1/upload_document", json={
        "file_path": "test.pdf",
        "document_id": "test-id",
        "user_id": "test-user"
    })
    # Should be unauthorized without token
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_ask_question_unauthorized(client):
    response = await client.post("/api/v1/ask_question", json={
        "question": "What is this about?",
        "document_ids": ["test-id"],
        "user_id": "test-user"
    })
    # Should be unauthorized without token
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_documents_unauthorized(client):
    response = await client.get("/api/v1/documents")
    # Should be unauthorized without token
    assert response.status_code == 403
