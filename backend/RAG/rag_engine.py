
import os
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
import requests
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Load environment variables
load_dotenv()

# Configuration
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Groq's latest Llama model
GROQ_API_BASE = "https://api.groq.com/openai/v1"  # Groq API endpoint


class ThyroRAGEngine:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("[WARNING] GROQ_API_KEY not found in environment variables.")
        
        # Initialize Database Connection
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            self.engine = create_engine(db_url, echo=False)
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            print("[OK] PostgreSQL connection established")
        else:
            self.engine = None
            self.SessionLocal = None
            print("[WARNING] DATABASE_URL not found, user data will not be included in RAG")
        
        # Initialize Embeddings
        print("Loading embeddings...")
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        
        # Load Vector Store
        if os.path.exists(DB_DIR):
            self.vectorstore = Chroma(
                persist_directory=DB_DIR,
                embedding_function=self.embeddings
            )
            print("[OK] Vector database loaded successfully")
        else:
            self.vectorstore = None
            print("[ERROR] Vector database NOT found. Run create_vector_db.py first.")

    def get_user_context(self):
        """Fetch recent user data from PostgreSQL to include in RAG context"""
        if not self.SessionLocal:
            return ""
        
        try:
            db = self.SessionLocal()
            
            # Query recent users and predictions
            query_text = """
            SELECT 
                u.username, 
                u.full_name, 
                u.patient_id,
                u.sex,
                u.created_at as user_created,
                u.last_login,
                p.age,
                p.prediction,
                p.confidence,
                p."TSH",
                p."T3",
                p."TT4",
                p.created_at as prediction_date
            FROM users u
            LEFT JOIN predictions p ON u.id = p.user_id
            ORDER BY p.created_at DESC
            LIMIT 10;
            """
            
            result = db.execute(text(query_text))
            rows = result.fetchall()
            
            if not rows:
                db.close()
                return ""
            
            # Format user data as context
            user_context = "\n=== RECENT PATIENT DATA (From Database) ===\n"
            
            for row in rows:
                username, full_name, patient_id, sex, user_created, last_login, age, prediction, confidence, tsh, t3, tt4, pred_date = row
                
                if prediction:  # Has prediction data
                    user_context += f"\nPatient: {full_name} ({patient_id})\n"
                    user_context += f"  - Registered: {user_created.strftime('%Y-%m-%d %H:%M') if user_created else 'N/A'}\n"
                    user_context += f"  - Last Prediction: {pred_date.strftime('%Y-%m-%d %H:%M') if pred_date else 'N/A'}\n"
                    user_context += f"  - Demographics: Age {age}, Sex {sex}\n"
                    user_context += f"  - Lab Results: TSH={tsh}, T3={t3}, TT4={tt4}\n"
                    user_context += f"  - Diagnosis: {prediction} (Confidence: {confidence:.1%})\n"
            
            db.close()
            return user_context + "\n"
            
        except Exception as e:
            print(f"[WARNING] Error fetching user context: {e}")
            return ""

    def get_response(self, query):
        if not self.vectorstore:
            return "I'm sorry, my knowledge base is currently being updated. Please try again later."
        
        if not self.api_key:
            return "Groq API key is missing. Please configure it to use the RAG chatbot."

        try:
            # 1. Retrieve relevant documents from vector store
            docs = self.vectorstore.similarity_search(query, k=4)
            vector_context = "\n\n".join([d.page_content for d in docs])
            
            # 2. Get recent user data from PostgreSQL
            user_context = self.get_user_context()
            
            # 3. Combine both contexts
            full_context = user_context + vector_context
            
            # 4. Construct Prompt
            prompt = f"""You are a specialized Medical Assistant focusing on Thyroid Health called ThyroRAG.
Use the following pieces of retrieved context to answer the user's question.
The context includes both general medical knowledge and recent patient data with timestamps.
If the context doesn't contain the answer, say "I don't have enough information to answer that based on my database" and give a general helpful answer only if you are sure.

Context:
{full_context}

Question: {query}

Helpful Answer:"""

            # 5. Call Groq API using OpenAI-compatible format
            url = f"{GROQ_API_BASE}/chat/completions"
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            }
            
            data = {
                "model": GROQ_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a specialized Medical Assistant focusing on Thyroid Health called ThyroRAG. Provide accurate, helpful medical information based on the context provided."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 1024
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            # Handle rate limiting and quota errors
            if response.status_code == 429:
                return "[QUOTA EXCEEDED] Groq API rate limit exceeded. Please try again in a moment."
            
            if response.status_code != 200:
                return f"[ERROR] Error from Groq API: {response.status_code}, {response.text}"
            
            result = response.json()
            
            # Groq uses OpenAI-compatible response format
            if 'choices' in result and len(result['choices']) > 0:
                return result['choices'][0]['message']['content']
            else:
                return "I couldn't generate a response. Please try again."

        except Exception as e:
            import traceback
            traceback.print_exc()
            return f"Error generating response: {str(e)}"


# Singleton instance
rag_engine = ThyroRAGEngine()
