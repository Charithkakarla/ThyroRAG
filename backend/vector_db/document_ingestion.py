"""
document_ingestion.py
---------------------
Handles the full pipeline for adding medical documents to Qdrant:

  1. Text → chunks  (fixed-size sliding window with overlap)
  2. Chunks → embeddings  (via EmbeddingService)
  3. Embeddings + metadata → Qdrant upsert  (idempotent)

Usage
-----
    from vector_db.document_ingestion import DocumentIngestionService

    svc = DocumentIngestionService()

    # Ingest a single document
    ids = svc.ingest_document(
        text="Hypothyroidism is a condition in which the thyroid gland...",
        source="thyroid_guide.pdf",
        document_id="doc_001",
        extra_metadata={"category": "hypothyroidism"},
    )

    # Ingest many documents at once
    docs = [{"text": "...", "source": "...", "document_id": "..."}, ...]
    svc.ingest_documents(docs)
"""

from __future__ import annotations

import hashlib
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from qdrant_client.http import models as qdrant_models

from vector_db.embedding_service import embedding_service
from vector_db.qdrant_client import COLLECTION_NAME, qdrant_client


# ── Chunking defaults ─────────────────────────────────────────────────────────
DEFAULT_CHUNK_SIZE = 400       # characters per chunk
DEFAULT_CHUNK_OVERLAP = 80     # characters of overlap between consecutive chunks


def _split_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[str]:
    """
    Split *text* into overlapping chunks of approximately *chunk_size* chars.

    Strategy
    --------
    Prefer splitting at sentence boundaries (`. `, `? `, `! `), then at word
    boundaries.  Pure character splits are used only as a last resort.

    Parameters
    ----------
    text         : raw document text (may contain newlines, multiple spaces)
    chunk_size   : target maximum characters per chunk
    chunk_overlap: how many characters of the previous chunk to repeat at the
                   start of the next chunk (maintains context continuity)

    Returns
    -------
    list[str]
        Non-empty text chunks, stripped of leading/trailing whitespace.
    """
    # Normalise whitespace
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) <= chunk_size:
        return [text]

    chunks: List[str] = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        if end < len(text):
            # Try to break at a sentence boundary within the last 100 chars
            sentence_end = max(
                text.rfind(". ", start, end),
                text.rfind("? ", start, end),
                text.rfind("! ", start, end),
            )
            if sentence_end > start + chunk_size // 2:
                end = sentence_end + 1          # include the punctuation
            else:
                # Fall back to a word boundary
                word_end = text.rfind(" ", start, end)
                if word_end > start:
                    end = word_end

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Advance by (chunk_size - overlap) so the next chunk has context
        start += max(1, chunk_size - chunk_overlap)

    return chunks


def _stable_point_id(document_id: str, chunk_index: int) -> str:
    """
    Derive a deterministic UUID from document_id + chunk_index.

    This makes the upsert idempotent: re-ingesting the same document overwrites
    existing vectors rather than creating duplicates.
    """
    seed = f"{document_id}::chunk::{chunk_index}"
    digest = hashlib.md5(seed.encode()).hexdigest()
    return str(uuid.UUID(digest))


class DocumentIngestionService:
    """
    Orchestrates text splitting, embedding, and Qdrant upsert for one or many
    medical documents.
    """

    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    # ── Public API ────────────────────────────────────────────────────────────

    def ingest_document(
        self,
        text: str,
        source: str,
        document_id: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """
        Ingest a single document into Qdrant.

        Parameters
        ----------
        text           : full document text
        source         : human-readable origin (file path, URL, DB table, …)
        document_id    : stable identifier; auto-generated if omitted
        extra_metadata : any additional key/value pairs to store as payload

        Returns
        -------
        list[str]
            Point IDs of the upserted chunks.
        """
        if not qdrant_client:
            raise RuntimeError("Qdrant client is not available.")

        document_id = document_id or str(uuid.uuid4())
        chunks = _split_text(text, self.chunk_size, self.chunk_overlap)

        if not chunks:
            return []

        # Batch-generate embeddings for all chunks in one forward pass
        vectors = embedding_service.embed_texts(chunks)
        now_iso = datetime.now(timezone.utc).isoformat()

        points: List[qdrant_models.PointStruct] = []
        point_ids: List[str] = []

        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            pid = _stable_point_id(document_id, i)
            payload: Dict[str, Any] = {
                "document_id": document_id,
                "source": source,
                "chunk_text": chunk,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "timestamp": now_iso,
            }
            if extra_metadata:
                payload.update(extra_metadata)

            points.append(
                qdrant_models.PointStruct(
                    id=pid,
                    vector=vector,
                    payload=payload,
                )
            )
            point_ids.append(pid)

        # Upsert is idempotent: existing points with the same ID are overwritten
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
            wait=True,   # block until indexing is complete
        )

        print(f"[OK] Ingested document '{document_id}' → {len(chunks)} chunks into Qdrant")
        return point_ids

    def ingest_documents(
        self,
        documents: List[Dict[str, Any]],
    ) -> Dict[str, List[str]]:
        """
        Ingest multiple documents in a single call.

        Parameters
        ----------
        documents : list of dicts, each containing at minimum:
            - ``text``        (str)  required
            - ``source``      (str)  required
            - ``document_id`` (str)  optional
            - ``extra_metadata`` (dict) optional

        Returns
        -------
        dict[document_id → list[point_ids]]
        """
        results: Dict[str, List[str]] = {}
        for doc in documents:
            doc_id = doc.get("document_id") or str(uuid.uuid4())
            ids = self.ingest_document(
                text=doc["text"],
                source=doc["source"],
                document_id=doc_id,
                extra_metadata=doc.get("extra_metadata"),
            )
            results[doc_id] = ids

        return results


# ── Module-level singleton ────────────────────────────────────────────────────
ingestion_service = DocumentIngestionService()
