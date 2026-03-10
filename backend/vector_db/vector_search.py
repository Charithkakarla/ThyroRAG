"""
vector_search.py
----------------
Performs similarity searches against the Qdrant ``medical_knowledge`` collection.

Flow
----
  query text  →  embedding  →  Qdrant similarity search  →  ranked results

Usage
-----
    from vector_db.vector_search import VectorSearchService

    svc = VectorSearchService()
    hits = svc.search("What are the symptoms of hypothyroidism?", top_k=5)
    for hit in hits:
        print(hit["score"], hit["chunk_text"])
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from qdrant_client.http import models as qdrant_models

from vector_db.embedding_service import embedding_service
from vector_db.qdrant_client import COLLECTION_NAME, qdrant_client


class VectorSearchService:
    """
    Wraps Qdrant query operations and returns clean Python dicts instead of
    raw SDK objects.
    """

    # ── Public API ────────────────────────────────────────────────────────────

    def search(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Embed *query* and return the *top_k* most similar document chunks.

        Parameters
        ----------
        query           : natural-language question or search string
        top_k           : maximum number of results to return (default 5)
        score_threshold : discard results with cosine similarity below this
                          value (0.0 = return all)
        metadata_filter : optional Qdrant filter on payload fields, e.g.::

                              {"source": "thyroid_guide.pdf"}

        Returns
        -------
        list[dict]
            Each dict contains the payload fields plus a ``score`` key
            (cosine similarity, higher is better).
        """
        if not qdrant_client:
            return []

        # Step 1: Convert the query string into a dense vector
        query_vector = embedding_service.embed_text(query)

        # Step 2: Build an optional payload filter
        qdrant_filter = None
        if metadata_filter:
            conditions = [
                qdrant_models.FieldCondition(
                    key=k,
                    match=qdrant_models.MatchValue(value=v),
                )
                for k, v in metadata_filter.items()
            ]
            qdrant_filter = qdrant_models.Filter(must=conditions)

        # Step 3: Perform the approximate nearest-neighbour search
        search_results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=top_k,
            score_threshold=score_threshold if score_threshold > 0.0 else None,
            query_filter=qdrant_filter,
            with_payload=True,   # include all stored metadata
            with_vectors=False,  # skip raw vectors to reduce payload size
        )

        # Step 4: Flatten ScoredPoint objects into plain dicts
        results: List[Dict[str, Any]] = []
        for hit in search_results:
            entry: Dict[str, Any] = {"score": round(hit.score, 6)}
            if hit.payload:
                entry.update(hit.payload)
            entry["point_id"] = str(hit.id)
            results.append(entry)

        return results

    def search_for_context(self, query: str, top_k: int = 5) -> str:
        """
        Convenience wrapper: run a search and return the retrieved chunks
        joined as a single string, ready to be inserted into an LLM prompt.

        Parameters
        ----------
        query  : user question
        top_k  : number of chunks to retrieve

        Returns
        -------
        str
            Newline-separated excerpts with provenance labels, or an empty
            string when nothing relevant is found.
        """
        hits = self.search(query, top_k=top_k, score_threshold=0.25)

        if not hits:
            return ""

        parts: List[str] = []
        for i, hit in enumerate(hits, start=1):
            source = hit.get("source", "unknown")
            score = hit.get("score", 0.0)
            chunk = hit.get("chunk_text", "")
            parts.append(
                f"[Excerpt {i} | source: {source} | relevance: {score:.2%}]\n{chunk}"
            )

        return "\n\n".join(parts)

    # ── Utility helpers ───────────────────────────────────────────────────────

    def collection_info(self) -> Dict[str, Any]:
        """Return basic statistics about the medical_knowledge collection."""
        if not qdrant_client:
            return {"error": "Qdrant unavailable"}
        info = qdrant_client.get_collection(COLLECTION_NAME)
        return {
            "name": COLLECTION_NAME,
            "vectors_count": info.vectors_count,
            "indexed_vectors_count": info.indexed_vectors_count,
            "status": info.status,
        }

    def delete_document(self, document_id: str) -> int:
        """
        Remove all chunks belonging to *document_id* from Qdrant.

        Returns
        -------
        int
            Number of points deleted.
        """
        if not qdrant_client:
            return 0

        result = qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qdrant_models.FilterSelector(
                filter=qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="document_id",
                            match=qdrant_models.MatchValue(value=document_id),
                        )
                    ]
                )
            ),
        )
        deleted = result.result.deleted if result.result else 0
        print(f"[OK] Deleted {deleted} chunks for document '{document_id}'")
        return deleted


# ── Module-level singleton ────────────────────────────────────────────────────
vector_search_service = VectorSearchService()
