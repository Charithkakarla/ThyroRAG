"""
embedding_service.py
--------------------
Wraps ``sentence-transformers`` to produce dense vector embeddings.

The same model is used for both **ingestion** (document chunks) and
**retrieval** (query), which guarantees the embedding space is consistent.

Usage
-----
    from vector_db.embedding_service import EmbeddingService

    svc = EmbeddingService()
    vec  = svc.embed_text("What is hypothyroidism?")   # → list[float] len=384
    vecs = svc.embed_texts(["chunk1", "chunk2"])        # → list[list[float]]
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv(Path(__file__).parent.parent / ".env")

# ── Model configuration ───────────────────────────────────────────────────────
# Default: all-MiniLM-L6-v2  →  384-dimensional embeddings
# If you switch to a larger model (e.g. text-embedding-3-small → 1536 dims),
# also update QDRANT_VECTOR_SIZE in .env and delete + recreate the collection.
_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


class EmbeddingService:
    """
    Lightweight wrapper around SentenceTransformer that:
    - loads the model once (singleton-style via ``_instance``),
    - exposes ``embed_text`` / ``embed_texts`` helpers,
    - normalises outputs to unit vectors (required for cosine similarity).
    """

    _instance: EmbeddingService | None = None
    _model: SentenceTransformer | None = None

    def __new__(cls) -> EmbeddingService:
        # Reuse the same Python object so the model weights are loaded only once
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self) -> None:
        """Load the SentenceTransformer model into memory."""
        print(f"[INFO] Loading embedding model '{_MODEL_NAME}' …")
        self._model = SentenceTransformer(_MODEL_NAME)
        print(f"[OK] Embedding model loaded  (dim={self.vector_size})")

    # ── Public API ────────────────────────────────────────────────────────────

    @property
    def vector_size(self) -> int:
        """Return the output dimensionality of the current model."""
        return self._model.get_sentence_embedding_dimension()  # type: ignore[union-attr]

    def embed_text(self, text: str) -> List[float]:
        """
        Embed a single piece of text and return a normalised float list.

        Parameters
        ----------
        text : str
            Raw text to embed (will be truncated to the model's max token limit).

        Returns
        -------
        list[float]
            Normalised embedding vector of length ``vector_size``.
        """
        vector = self._model.encode(  # type: ignore[union-attr]
            text,
            normalize_embeddings=True,  # unit-norm for cosine similarity
            show_progress_bar=False,
        )
        return vector.tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Batch-embed a list of texts efficiently.

        Parameters
        ----------
        texts : list[str]
            Texts to embed.

        Returns
        -------
        list[list[float]]
            One normalised embedding per input text.
        """
        vectors = self._model.encode(  # type: ignore[union-attr]
            texts,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=False,
        )
        return [v.tolist() for v in vectors]


# ── Module-level singleton ────────────────────────────────────────────────────
embedding_service = EmbeddingService()
