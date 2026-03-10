"""
rag_routes.py
-------------
FastAPI router that exposes the Qdrant-based RAG pipeline endpoints:

  POST /ingest-documents  – add medical knowledge to the vector database
  POST /query             – perform retrieval-augmented generation (RAG)
  GET  /rag/collection-info – inspect the Qdrant collection statistics
  DELETE /rag/document/{document_id} – remove a document from the vector DB

Architecture
------------
  React Frontend
      ↓ POST /query
  FastAPI (rag_routes.py)
      ↓ embed query
  Qdrant VectorSearch (vector_search.py)
      ↓ retrieved context chunks
  Groq LLM  (llama-3.3-70b-versatile)
      ↓ grounded answer
  React Frontend
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.auth_middleware import get_current_user
from vector_db.document_ingestion import ingestion_service
from vector_db.vector_search import vector_search_service

load_dotenv(Path(__file__).parent.parent / ".env")

# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/rag", tags=["RAG / Qdrant"])

# ── Groq configuration (same model used by the existing RAG engine) ───────────
_GROQ_API_KEY = os.getenv("GROQ_API_KEY")
_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_GROQ_API_BASE = "https://api.groq.com/openai/v1"


# ── Request / Response schemas ────────────────────────────────────────────────

class IngestDocument(BaseModel):
    """A single document to be ingested into the vector database."""
    text: str = Field(..., description="Full document text to embed and store.")
    source: str = Field(..., description="Human-readable provenance (filename, URL, …).")
    document_id: Optional[str] = Field(
        None,
        description="Stable identifier.  Auto-generated if omitted.",
    )
    extra_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional key/value pairs stored alongside the vector.",
    )


class IngestRequest(BaseModel):
    """Body for POST /rag/ingest-documents."""
    documents: List[IngestDocument] = Field(
        ..., description="One or more documents to ingest.", min_length=1
    )


class IngestResponse(BaseModel):
    status: str
    ingested: int                       # number of documents processed
    total_chunks: int                   # total point count written to Qdrant
    document_ids: List[str]


class QueryRequest(BaseModel):
    """Body for POST /rag/query."""
    question: str = Field(..., description="Natural-language question.")
    top_k: int = Field(5, ge=1, le=20, description="Number of context chunks to retrieve.")
    score_threshold: float = Field(
        0.25, ge=0.0, le=1.0,
        description="Minimum cosine similarity score for a chunk to be included."
    )
    metadata_filter: Optional[Dict[str, Any]] = Field(
        None, description="Optional Qdrant payload filter (e.g. {'source': 'doc.pdf'})."
    )


class RetrievedChunk(BaseModel):
    point_id: str
    score: float
    source: str
    chunk_text: str
    document_id: Optional[str] = None
    timestamp: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    retrieved_chunks: List[RetrievedChunk]
    status: str


# ── Helper: call Groq LLM ─────────────────────────────────────────────────────

def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
    """
    Send a chat-completion request to the Groq API and return the text answer.

    Falls back to an informative error string instead of raising so the API
    always returns a meaningful response to the client.
    """
    if not _GROQ_API_KEY:
        return "Groq API key is not configured.  Please set GROQ_API_KEY in .env."

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {_GROQ_API_KEY}",
    }
    payload = {
        "model": _GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "temperature": 0.3,
        "max_tokens": max_tokens,
    }

    try:
        resp = requests.post(
            f"{_GROQ_API_BASE}/chat/completions",
            headers=headers,
            json=payload,
            timeout=30,
        )
    except requests.exceptions.Timeout:
        return "The language model took too long to respond. Please try again."
    except requests.exceptions.RequestException as exc:
        return f"Network error while calling Groq: {exc}"

    if resp.status_code == 429:
        return "Rate limit reached.  Please wait a moment and try again."
    if resp.status_code != 200:
        return f"Groq API error ({resp.status_code}): {resp.text}"

    data = resp.json()
    choices = data.get("choices", [])
    if choices:
        return choices[0]["message"]["content"]
    return "The language model returned an empty response."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/ingest-documents",
    response_model=IngestResponse,
    summary="Add medical knowledge to the Qdrant vector database",
)
async def ingest_documents(
    body: IngestRequest,
    _current_user=Depends(get_current_user),
):
    """
    **Ingest one or more medical / thyroid-knowledge documents.**

    Each document is:
    1. Split into overlapping text chunks (~400 chars).
    2. Embedded with ``sentence-transformers/all-MiniLM-L6-v2``.
    3. Stored in Qdrant with metadata (document_id, source, chunk_text, timestamp).

    The operation is idempotent: re-ingesting the same ``document_id`` silently
    overwrites existing vectors rather than creating duplicates.
    """
    doc_dicts = [
        {
            "text": d.text,
            "source": d.source,
            "document_id": d.document_id,
            "extra_metadata": d.extra_metadata,
        }
        for d in body.documents
    ]

    try:
        id_map = ingestion_service.ingest_documents(doc_dicts)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Ingestion error: {exc}")

    total_chunks = sum(len(ids) for ids in id_map.values())
    return IngestResponse(
        status="ok",
        ingested=len(id_map),
        total_chunks=total_chunks,
        document_ids=list(id_map.keys()),
    )


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Retrieve context from Qdrant and generate an LLM answer",
)
async def rag_query(
    body: QueryRequest,
    _current_user=Depends(get_current_user),
):
    """
    **Full RAG pipeline:**

    1. Embed the user's question.
    2. Search Qdrant for the *top_k* most relevant chunks.
    3. Build a grounded prompt combining the question + retrieved context.
    4. Send the prompt to the Groq LLM.
    5. Return the LLM answer together with the retrieved source passages.
    """
    # Step 1 + 2: retrieval
    hits = vector_search_service.search(
        query=body.question,
        top_k=body.top_k,
        score_threshold=body.score_threshold,
        metadata_filter=body.metadata_filter,
    )

    # Step 3: build augmented prompt
    if hits:
        context_lines = []
        for i, hit in enumerate(hits, 1):
            source = hit.get("source", "unknown")
            text   = hit.get("chunk_text", "")
            score  = hit.get("score", 0.0)
            context_lines.append(
                f"[Passage {i} | {source} | relevance {score:.2%}]\n{text}"
            )
        context_block = "\n\n".join(context_lines)
    else:
        context_block = "No relevant passages were found in the knowledge base."

    system_prompt = (
        "You are ThyroRAG, a specialised medical assistant focused on thyroid health. "
        "Answer the user's question using ONLY the provided context passages. "
        "If the context does not contain enough information, say so clearly and "
        "provide a brief general medical answer. "
        "Always recommend consulting a qualified healthcare professional."
    )
    user_prompt = (
        f"Context:\n{context_block}\n\n"
        f"Question: {body.question}\n\n"
        "Answer:"
    )

    # Step 4: LLM call
    answer = _call_groq(system_prompt, user_prompt)

    # Step 5: shape response
    retrieved = [
        RetrievedChunk(
            point_id=h.get("point_id", ""),
            score=h.get("score", 0.0),
            source=h.get("source", ""),
            chunk_text=h.get("chunk_text", ""),
            document_id=h.get("document_id"),
            timestamp=h.get("timestamp"),
        )
        for h in hits
    ]

    return QueryResponse(
        answer=answer,
        retrieved_chunks=retrieved,
        status="ok",
    )


@router.get(
    "/collection-info",
    summary="Get statistics about the Qdrant medical_knowledge collection",
)
async def collection_info(_current_user=Depends(get_current_user)):
    """Return vector count, index status, and configuration for the collection."""
    try:
        return vector_search_service.collection_info()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.delete(
    "/document/{document_id}",
    summary="Remove all chunks of a document from Qdrant",
)
async def delete_document(
    document_id: str,
    _current_user=Depends(get_current_user),
):
    """Delete every vector chunk that belongs to *document_id*."""
    try:
        deleted = vector_search_service.delete_document(document_id)
        return {"deleted_chunks": deleted, "document_id": document_id, "status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
