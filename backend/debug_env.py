
import os
from dotenv import load_dotenv

# Explicitly point to .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    print(f"✅ Found .env at {dotenv_path}")
    load_dotenv(dotenv_path)
else:
    print(f"❌ .env NOT found at {dotenv_path}")

key = os.getenv("GEMINI_API_KEY")
if key:
    print(f"✅ API Key loaded: {key[:5]}...{key[-5:]}")
else:
    print("❌ API Key is None")

from RAG.rag_engine import rag_engine
print(f"Engine Key: {rag_engine.api_key[:5]}..." if rag_engine.api_key else "Engine Key is None")
