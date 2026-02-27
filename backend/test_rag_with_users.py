"""
Test RAG system with PostgreSQL user data integration
"""
from RAG.rag_engine import ThyroRAGEngine

print("=" * 60)
print("TESTING RAG WITH POSTGRESQL USER DATA")
print("=" * 60)

# Initialize RAG engine
rag = ThyroRAGEngine()

# Test query about recent patients
print("\n🔍 Test Query: Tell me about recent patients in the database")
print("-" * 60)

response = rag.get_response("Tell me about the recent patients who have been diagnosed in our system")

print("\n📝 RAG Response:")
print(response)

print("\n" + "=" * 60)
print("Test completed!")
print("=" * 60)
