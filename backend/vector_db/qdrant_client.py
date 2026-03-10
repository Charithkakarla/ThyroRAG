"""
qdrant_client.py
----------------
Creates and exposes a singleton QdrantClient connected to the local Qdrant
instance (localhost:6333) and ensures the ``medical_knowledge`` collection
exists with the correct vector configuration.

Usage
-----
    from vector_db.qdrant_client import qdrant_client, COLLECTION_NAME

The module is imported at FastAPI startup so that any import-time errors
(e.g. Qdrant not running) are reported immediately rather than at first request.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

# ── Environment ──────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env")

# ── Configuration ────────────────────────────────────────────────────────────
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")          # None for local instances

# Collection that stores all medical / thyroid-knowledge chunks
COLLECTION_NAME = "medical_knowledge"

# Must match the output dimensionality of the embedding model.
# sentence-transformers/all-MiniLM-L6-v2  →  384 dimensions
VECTOR_SIZE = int(os.getenv("QDRANT_VECTOR_SIZE", "384"))


def _create_qdrant_client() -> QdrantClient:
    """
    Instantiate a QdrantClient and guarantee that the target collection exists.

    For local development the client connects without authentication.
    For cloud/production deployments set QDRANT_API_KEY in the .env file.
    """
    client_kwargs: dict = {"host": QDRANT_HOST, "port": QDRANT_PORT}
    if QDRANT_API_KEY:
        client_kwargs["api_key"] = QDRANT_API_KEY

    client = QdrantClient(**client_kwargs)

    # Ensure the collection is present; create it if not
    _bootstrap_collection(client)

    print(f"[OK] Qdrant client connected to {QDRANT_HOST}:{QDRANT_PORT}")
    return client


def _bootstrap_collection(client: QdrantClient) -> None:
    """
    Create the ``medical_knowledge`` collection if it does not already exist.

    Vector configuration
    --------------------
    - size     : VECTOR_SIZE (defaults to 384 for all-MiniLM-L6-v2)
    - distance : Cosine – appropriate for normalised sentence embeddings
    """
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME in existing:
        print(f"[OK] Qdrant collection '{COLLECTION_NAME}' already exists")
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=qdrant_models.VectorParams(
            size=VECTOR_SIZE,
            distance=qdrant_models.Distance.COSINE,
        ),
        # Optional: enable on-disk storage for large collections
        # on_disk_payload=True,
    )
    print(f"[OK] Qdrant collection '{COLLECTION_NAME}' created "
          f"(dim={VECTOR_SIZE}, distance=Cosine)")


# ── Singleton ────────────────────────────────────────────────────────────────
# Instantiated once at module-import time.  If Qdrant is unreachable the error
# is caught by the caller so the rest of the app continues to work.
try:
    qdrant_client: QdrantClient = _create_qdrant_client()
except Exception as _e:
    qdrant_client = None  # type: ignore[assignment]
    print(f"[WARNING] Could not connect to Qdrant at {QDRANT_HOST}:{QDRANT_PORT} – {_e}")
    print("[WARNING] Qdrant RAG features will be unavailable until Qdrant is running.")
