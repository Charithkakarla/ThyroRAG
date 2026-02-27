import os
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings


from langchain.docstore.document import Document

# Configuration
CSV_PATH = "../../thyroidDF (1).csv"
DB_DIR = "chroma_db"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

def create_vector_db():
    print("🏥 Starting Vector Database Creation...")
    
    # 1. Load the CSV data
    if not os.path.exists(CSV_PATH):
        # Try another path just in case
        alternative_path = "../thyroidDF (1).csv"
        if os.path.exists(alternative_path):
            df = pd.read_csv(alternative_path)
        else:
            print(f"❌ Error: CSV file not found at {CSV_PATH}")
            return
    else:
        df = pd.read_csv(CSV_PATH)
    
    print(f"✅ Loaded {len(df)} rows of data")
    
    # 2. Convert CSV rows to Documents for LangChain
    documents = []
    
    # We only take a subset or summarize rows to avoid overwhelming the vector DB
    # For a RAG system, we want meaningful text. 
    # Let's create a textual description for each row (patient case)
    print("📝 Converting records to medical documents...")
    for _, row in df.head(1000).iterrows(): # Limiting to 1000 for efficiency in prototype
        content = f"Patient Case: A {row['age']} year old {row['sex']} "
        if row['on_thyroxine'] == 't': content += "currently on thyroxine. "
        if row['sick'] == 't': content += "reported being sick. "
        if row['pregnant'] == 't': content += "is pregnant. "
        if row['thyroid_surgery'] == 't': content += "had thyroid surgery. "
        
        content += f"Lab results: TSH: {row['TSH']}, T3: {row['T3']}, TT4: {row['TT4']}, T4U: {row['T4U']}, FTI: {row['FTI']}. "
        content += f"Diagnosis code: {row['target']}."
        
        doc = Document(page_content=content, metadata={"source": "thyroid_dataset", "id": _})
        documents.append(doc)
    
    # 3. Add General Medical Knowledge (The "Static Data" replacement)
    medical_knowledge = [
        Document(page_content="""Hypothyroidism occurs when the thyroid gland doesn't produce enough thyroid hormones. 
        Symptoms include fatigue, weight gain, cold intolerance, dry skin, and constipation. 
        Dietary recommendations include iodine-rich foods like dairy and fish, and limiting raw cruciferous vegetables (goitrogens).""", 
        metadata={"source": "medical_knowledge"}),
        
        Document(page_content="""Hyperthyroidism is a condition where the thyroid gland produces too much thyroxine hormone. 
        Symptoms include sudden weight loss, rapid heartbeat, sweating, and irritability. 
        Patients should avoid excessive iodine and focus on calcium-rich foods to support bone health.""", 
        metadata={"source": "medical_knowledge"}),
        
        Document(page_content="""Normal TSH levels typically range from 0.4 to 4.0 mIU/L. High TSH often indicates hypothyroidism, 
        as the pituitary gland tries to stimulate the thyroid. Low TSH often indicates hyperthyroidism.""", 
        metadata={"source": "medical_knowledge"}),
        
        Document(page_content="""Levothyroxine is the standard treatment for hypothyroidism. It should be taken on an empty stomach, 
        usually 30-60 minutes before breakfast, to ensure proper absorption.""", 
        metadata={"source": "medical_knowledge"}),
        
        Document(page_content="""Thyroid nodules are lumps that commonly arise within the thyroid gland. Most are benign, 
        but some can be cancerous. Diagnosis usually involves ultrasound and fine-needle aspiration biopsy.""", 
        metadata={"source": "medical_knowledge"})
    ]
    documents.extend(medical_knowledge)
    
    print(f"📚 Total documents: {len(documents)}")
    
    # 4. Initialize Embeddings
    print(f"🤖 Initializing embedding model: {EMBEDDING_MODEL}...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    # 5. Create and persist ChromaDB
    print(f"🗄️ Creating vector store in {DB_DIR}...")
    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=DB_DIR
    )
    
    print("✅ Vector database created and saved successfully!")

if __name__ == "__main__":
    create_vector_db()
