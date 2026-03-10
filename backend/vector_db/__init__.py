"""
vector_db package
-----------------
Provides a Qdrant-backed vector database layer for the ThyroRAG system.

Modules
-------
qdrant_client      – singleton Qdrant client + collection bootstrapping
embedding_service  – sentence-transformer embedding generation
document_ingestion – text chunking + batch upsert into Qdrant
vector_search      – similarity search helpers
"""
