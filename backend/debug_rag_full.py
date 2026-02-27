
import os
print("1. Importing modules...")
try:
    from dotenv import load_dotenv
    from langchain_community.vectorstores import Chroma
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.chains import RetrievalQA
    from langchain.prompts import PromptTemplate
    print("2. Imports successful")
except Exception as e:
    print(f"❌ Import error: {e}")
    exit(1)

print("3. Init Embeddings...")
try:
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    print("✅ Embeddings initialized")
except Exception as e:
    print(f"❌ Embeddings error: {e}")
    exit(1)

print("4. Init Chroma...")
try:
    DB_DIR = "RAG/chroma_db"
    if os.path.exists(DB_DIR):
        print(f"Found DB at {DB_DIR}")
        vectorstore = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        print("✅ Chroma initialized")
    else:
        print(f"⚠️ DB not found at {DB_DIR}")
except Exception as e:
    print(f"❌ Chroma error: {e}")
    exit(1)

print("5. Init Gemini...")
try:
    # We won't actually call it, just init class
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key="TEST_KEY")
    print("✅ Gemini initialized")
except Exception as e:
    print(f"❌ Gemini error: {e}")
    exit(1)

print("🎉 All checks passed!")
