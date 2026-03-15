import os

import pandas as pd

from vector_db.document_ingestion import ingestion_service

# Configuration
CSV_PATH = "../../thyroidDF (1).csv"
def create_vector_db():
    print("🏥 Starting Qdrant Knowledge Base Creation...")
    
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
    
    # 2. Convert CSV rows to plain-text documents for Qdrant
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
        
        documents.append({
            "text": content,
            "source": "thyroid_dataset",
            "document_id": f"thyroid_case_{_}",
            "extra_metadata": {"category": "knowledge_base", "record_id": int(_)},
        })
    
    # 3. Add General Medical Knowledge (The "Static Data" replacement)
    medical_knowledge = [
        {
            "text": """Hypothyroidism occurs when the thyroid gland doesn't produce enough thyroid hormones. 
        Symptoms include fatigue, weight gain, cold intolerance, dry skin, and constipation. 
        Dietary recommendations include iodine-rich foods like dairy and fish, and limiting raw cruciferous vegetables (goitrogens).""", 
            "source": "medical_knowledge",
            "document_id": "medical_knowledge_hypothyroidism",
            "extra_metadata": {"category": "knowledge_base"},
        },
        
        {
            "text": """Hyperthyroidism is a condition where the thyroid gland produces too much thyroxine hormone. 
        Symptoms include sudden weight loss, rapid heartbeat, sweating, and irritability. 
        Patients should avoid excessive iodine and focus on calcium-rich foods to support bone health.""", 
            "source": "medical_knowledge",
            "document_id": "medical_knowledge_hyperthyroidism",
            "extra_metadata": {"category": "knowledge_base"},
        },
        
        {
            "text": """Normal TSH levels typically range from 0.4 to 4.0 mIU/L. High TSH often indicates hypothyroidism, 
        as the pituitary gland tries to stimulate the thyroid. Low TSH often indicates hyperthyroidism.""", 
            "source": "medical_knowledge",
            "document_id": "medical_knowledge_tsh_ranges",
            "extra_metadata": {"category": "knowledge_base"},
        },
        
        {
            "text": """Levothyroxine is the standard treatment for hypothyroidism. It should be taken on an empty stomach, 
        usually 30-60 minutes before breakfast, to ensure proper absorption.""", 
            "source": "medical_knowledge",
            "document_id": "medical_knowledge_levothyroxine",
            "extra_metadata": {"category": "knowledge_base"},
        },
        
        {
            "text": """Thyroid nodules are lumps that commonly arise within the thyroid gland. Most are benign, 
        but some can be cancerous. Diagnosis usually involves ultrasound and fine-needle aspiration biopsy.""", 
            "source": "medical_knowledge",
            "document_id": "medical_knowledge_nodules",
            "extra_metadata": {"category": "knowledge_base"},
        }
    ]
    documents.extend(medical_knowledge)
    
    print(f"📚 Total documents: {len(documents)}")
    
    print("🗄️ Ingesting documents into Qdrant...")
    results = ingestion_service.ingest_documents(documents)
    print(f"✅ Qdrant knowledge base populated with {len(results)} documents!")

if __name__ == "__main__":
    create_vector_db()
