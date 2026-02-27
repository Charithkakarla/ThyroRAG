
print("1. Importing modules...")
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    print("2. Imported HuggingFaceEmbeddings")
except Exception as e:
    print(f"Error importing HuggingFaceEmbeddings: {e}")

try:
    print("3. Initializing Embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    print("4. Embeddings initialized successfully")
except Exception as e:
    print(f"Error initializing embeddings: {e}")
