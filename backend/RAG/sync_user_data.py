"""
Script to sync user data from PostgreSQL to vector database
Run this periodically to keep RAG context updated with latest users
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from langchain.docstore.document import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

# Load environment
load_dotenv()

# Configuration
DB_DIR = "chroma_db"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

def sync_user_data_to_vectorstore():
    """Fetch user data from PostgreSQL and add to vector database"""
    print("🔄 Starting user data sync to vector database...")
    
    # 1. Connect to PostgreSQL
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    engine = create_engine(db_url, echo=False)
    
    # 2. Query user data with predictions
    query = """
    SELECT 
        u.username, 
        u.full_name, 
        u.patient_id,
        u.sex,
        u.created_at,
        p.age,
        p.prediction,
        p.confidence,
        p."TSH",
        p."T3",
        p."TT4",
        p."T4U",
        p."FTI",
        p.on_thyroxine,
        p.sick,
        p.pregnant,
        p.thyroid_surgery,
        p.created_at as prediction_date
    FROM users u
    LEFT JOIN predictions p ON u.id = p.user_id
    WHERE p.prediction IS NOT NULL
    ORDER BY p.created_at DESC;
    """
    
    print("📊 Fetching user data from PostgreSQL...")
    with engine.connect() as conn:
        result = conn.execute(text(query))
        rows = result.fetchall()
    
    if not rows:
        print("⚠️ No user predictions found in database")
        return
    
    print(f"✅ Found {len(rows)} prediction records")
    
    # 3. Convert to LangChain Documents
    documents = []
    
    for row in rows:
        (username, full_name, patient_id, sex, created_at, age, prediction, 
         confidence, tsh, t3, tt4, t4u, fti, on_thyroxine, sick, pregnant, 
         thyroid_surgery, pred_date) = row
        
        # Create medical case description
        content = f"Patient Case from Database: {full_name} (ID: {patient_id})\n"
        content += f"Registered: {created_at.strftime('%Y-%m-%d')}\n"
        content += f"A {age} year old {sex}. "
        
        if on_thyroxine:
            content += "Currently on thyroxine medication. "
        if sick:
            content += "Reported feeling sick. "
        if pregnant:
            content += "Patient is pregnant. "
        if thyroid_surgery:
            content += "Had previous thyroid surgery. "
        
        content += f"\nLab Results (as of {pred_date.strftime('%Y-%m-%d')}): "
        content += f"TSH: {tsh}, T3: {t3}, TT4: {tt4}, T4U: {t4u}, FTI: {fti}. "
        content += f"\nDiagnosis: {prediction} (Confidence: {confidence:.1%})"
        
        doc = Document(
            page_content=content,
            metadata={
                "source": "postgresql_users",
                "patient_id": patient_id,
                "prediction": prediction,
                "timestamp": pred_date.isoformat()
            }
        )
        documents.append(doc)
    
    # 4. Load existing vector store and add new documents
    print("🤖 Loading embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    if os.path.exists(DB_DIR):
        print("📚 Loading existing vector database...")
        vectorstore = Chroma(
            persist_directory=DB_DIR,
            embedding_function=embeddings
        )
        
        print("➕ Adding user documents to vector store...")
        vectorstore.add_documents(documents)
        
        print(f"✅ Successfully added {len(documents)} user records to vector database!")
    else:
        print("❌ Vector database not found. Run create_vector_db.py first!")

if __name__ == "__main__":
    sync_user_data_to_vectorstore()
    print("\n💡 Tip: Run this script regularly to keep user data in sync!")
    print("   You can add it to a cron job or scheduled task.")
