"""
Quick test of Grok API integration
"""
from RAG.rag_engine import ThyroRAGEngine

print("\n" + "="*70)
print(" TESTING GROK API INTEGRATION")
print("="*70 + "\n")

# Initialize RAG engine
print("📡 Initializing RAG engine with Grok API...")
rag = ThyroRAGEngine()

print("\n" + "-"*70)
print("🔍 Test Query: What is hypothyroidism?")
print("-"*70 + "\n")

# Send test query
response = rag.get_response("What is hypothyroidism and what are its symptoms?")

print("🤖 Grok AI Response:")
print("-"*70)
print(response)
print("-"*70)

print("\n✅ Test completed!\n")
print("="*70)
