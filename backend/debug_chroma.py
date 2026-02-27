
import os
try:
    from langchain_community.vectorstores import Chroma
    from langchain_community.embeddings import HuggingFaceEmbeddings
    
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    db_dir = "RAG/chroma_db"
    
    if os.path.exists(db_dir):
        db = Chroma(persist_directory=db_dir, embedding_function=embeddings)
        print("DB Loaded.")
        docs = db.similarity_search("test", k=1)
        print(f"Search result: {len(docs)}")
    else:
        print("DB Dir not found")
except Exception as e:
    import traceback
    traceback.print_exc()
