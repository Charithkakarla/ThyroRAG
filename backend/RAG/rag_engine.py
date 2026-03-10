
import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import requests

load_dotenv(Path(__file__).parent.parent / ".env")

DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_API_BASE = "https://api.groq.com/openai/v1"


class ThyroRAGEngine:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("[WARNING] GROQ_API_KEY not found in environment variables.")

        # Import Supabase client lazily to avoid circular imports
        try:
            from supabase_client import supabase
            self.supabase = supabase
            print("[OK] Supabase connection established for RAG context")
        except Exception as e:
            self.supabase = None
            print(f"[WARNING] Could not connect to Supabase for RAG context: {e}")

        print("Loading embeddings...")
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

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
        """Fetch recent prediction data from Supabase to include in RAG context."""
        if not self.supabase:
            return ""
        try:
            resp = (
                self.supabase.table("predictions")
                .select("user_id, age, sex, prediction, confidence, tsh, t3, tt4, created_at")
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                return ""

            context = "\n=== RECENT PATIENT PREDICTIONS (From Supabase) ===\n"
            for row in rows:
                context += (
                    f"\nPatient ID: {row.get('user_id', 'N/A')}\n"
                    f"  - Date: {row.get('created_at', 'N/A')}\n"
                    f"  - Demographics: Age {row.get('age')}, Sex {row.get('sex')}\n"
                    f"  - Lab: TSH={row.get('tsh')}, T3={row.get('t3')}, TT4={row.get('tt4')}\n"
                    f"  - Diagnosis: {row.get('prediction')} "
                    f"(Confidence: {float(row.get('confidence', 0)):.1%})\n"
                )
            return context + "\n"
        except Exception as e:
            print(f"[WARNING] Error fetching user context from Supabase: {e}")
            return ""

    def add_patient_record(
        self,
        user_id: str,
        full_name: str,
        age,
        sex: str,
        tsh, t3, tt4, t4u, fti,
        on_thyroxine: bool,
        sick: bool,
        pregnant: bool,
        thyroid_surgery: bool,
        prediction: str,
        confidence: float,
        dob: str = "",
    ):
        """Upsert a patient prediction record into ChromaDB so the RAG chatbot can reference it."""
        if not self.vectorstore:
            print("[WARNING] Vector store not available — skipping ChromaDB upsert")
            return
        try:
            import datetime
            from langchain.docstore.document import Document

            today = datetime.date.today().isoformat()

            content = f"Patient Record: {full_name}\n"
            if dob:
                content += f"Date of Birth: {dob}\n"
            content += f"A {age} year old {sex}.\n"
            if on_thyroxine:
                content += "Currently on thyroxine medication. "
            if sick:
                content += "Reported feeling sick. "
            if pregnant:
                content += "Patient is pregnant. "
            if thyroid_surgery:
                content += "Had previous thyroid surgery. "
            content += f"\nLab Results (as of {today}): "
            content += f"TSH: {tsh}, T3: {t3}, TT4: {tt4}, T4U: {t4u}, FTI: {fti}.\n"
            content += f"Diagnosis: {prediction} (Confidence: {float(confidence):.1%})"

            doc = Document(
                page_content=content,
                metadata={
                    "source": "patient_prediction",
                    "user_id": user_id,
                    "patient_name": full_name,
                    "prediction": prediction,
                    "timestamp": today,
                },
            )
            self.vectorstore.add_documents([doc])
            print(f"[OK] Patient record for '{full_name}' added to ChromaDB")
        except Exception as e:
            print(f"[WARNING] Could not add patient record to ChromaDB: {e}")

    def get_response(self, query: str) -> str:
        if not self.vectorstore:
            return "My knowledge base is currently being updated. Please try again later."
        if not self.api_key:
            return "Groq API key is not configured."

        try:
            docs = self.vectorstore.similarity_search(query, k=4)
            vector_context = "\n\n".join([d.page_content for d in docs])
            user_context = self.get_user_context()
            full_context = user_context + vector_context

            prompt = f"""You are ThyroRAG, a specialized Medical Assistant focusing on Thyroid Health.
Use the retrieved context below to answer the user's question accurately.
If the context doesn't contain the answer, provide a helpful general answer based on medical knowledge.

Context:
{full_context}

Question: {query}

Answer:"""

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            }
            data = {
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "You are ThyroRAG, a medical assistant specializing in thyroid health."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 1024,
            }

            response = requests.post(
                f"{GROQ_API_BASE}/chat/completions",
                headers=headers,
                json=data,
                timeout=30,
            )

            if response.status_code == 429:
                return "Rate limit reached. Please wait a moment and try again."
            if response.status_code != 200:
                return f"Error from Groq API ({response.status_code}): {response.text}"

            result = response.json()
            if "choices" in result and result["choices"]:
                return result["choices"][0]["message"]["content"]
            return "Could not generate a response. Please try again."

        except Exception as e:
            import traceback
            traceback.print_exc()
            return f"Error generating response: {str(e)}"


rag_engine = ThyroRAGEngine()
