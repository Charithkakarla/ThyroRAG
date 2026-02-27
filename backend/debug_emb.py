
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    print("Imported.")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    print("Initialized.")
    res = embeddings.embed_query("test")
    print(f"Embeddings work. Len: {len(res)}")
except Exception as e:
    print(f"Error: {e}")
