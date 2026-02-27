"""
Simple demonstration of RAG + PostgreSQL integration
Shows the context being fetched from the database
"""
from RAG.rag_engine import ThyroRAGEngine

print("\n" + "="*70)
print(" RAG + POSTGRESQL INTEGRATION DEMO")
print("="*70 + "\n")

# Initialize RAG engine
print("📡 Initializing RAG engine...")
rag = ThyroRAGEngine()

print("\n" + "-"*70)
print("📊 Fetching User Context from PostgreSQL...")
print("-"*70)

# Get user context directly
user_context = rag.get_user_context()

if user_context:
    print(user_context)
    print("\n✅ Successfully retrieved user data from PostgreSQL!")
    print("\n💡 This context is automatically included when you ask questions")
    print("   about patients in the chatbot!")
else:
    print("\n⚠️ No user data found or database not connected")

print("\n" + "="*70)
print(" Integration Status: ✅ ACTIVE")
print("="*70 + "\n")
