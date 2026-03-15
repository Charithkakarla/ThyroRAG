"""
Script to sync user data from PostgreSQL to vector database
Run this periodically to keep RAG context updated with latest users
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

from vector_db.document_ingestion import ingestion_service

# Load environment
load_dotenv()

def sync_user_data_to_vectorstore():
    """Fetch user data from PostgreSQL and add to Qdrant."""
    print("🔄 Starting user data sync to Qdrant...")
    
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
    
    # 3. Convert rows into Qdrant documents
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
        
        documents.append({
            "text": content,
            "source": "postgresql_users",
            "document_id": f"postgres_user_{patient_id}_{pred_date.strftime('%Y%m%d_%H%M%S')}",
            "extra_metadata": {
                "category": "patient_prediction",
                "patient_id": patient_id,
                "prediction": prediction,
                "timestamp": pred_date.isoformat(),
            },
        })

    print("➕ Adding user documents to Qdrant...")
    ingestion_service.ingest_documents(documents)
    print(f"✅ Successfully added {len(documents)} user records to Qdrant!")

if __name__ == "__main__":
    sync_user_data_to_vectorstore()
    print("\n💡 Tip: Run this script regularly to keep user data in sync!")
    print("   You can add it to a cron job or scheduled task.")
