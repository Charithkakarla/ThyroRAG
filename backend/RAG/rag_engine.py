import os
import uuid
from pathlib import Path

import requests
from dotenv import load_dotenv

from vector_db.document_ingestion import ingestion_service
from vector_db.vector_search import vector_search_service

load_dotenv(Path(__file__).parent.parent / ".env")

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
        print("[OK] ThyroRAG configured to use Qdrant for retrieval")

    def get_user_context(self, user_id: str = ""):
        """Fetch recent prediction data from Supabase to include in RAG context."""
        if not self.supabase:
            return ""
        try:
            query = (
                self.supabase.table("predictions")
                .select("user_id, age, sex, prediction, confidence, tsh, t3, tt4, created_at")
                .order("created_at", desc=True)
                .limit(10)
            )
            if user_id:
                query = query.eq("user_id", user_id)
            resp = query.execute()
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
        """Upsert a patient prediction record into Qdrant for chat retrieval."""
        try:
            import datetime

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

            ingestion_service.ingest_document(
                text=content,
                source="patient_prediction",
                document_id=f"prediction_{user_id}_{uuid.uuid4().hex[:12]}",
                extra_metadata={
                    "category": "patient_prediction",
                    "user_id": user_id,
                    "patient_name": full_name,
                    "prediction": prediction,
                    "timestamp": today,
                },
            )
            print(f"[OK] Patient record for '{full_name}' added to Qdrant")
        except Exception as e:
            print(f"[WARNING] Could not add patient record to Qdrant: {e}")

    def get_response(self, query: str, extra_context: str = "", user_id: str = "", history=None) -> str:
        if not self.api_key:
            return "Groq API key is not configured."

        try:
            qdrant_context = ""
            try:
                hits = vector_search_service.search(
                    query=query,
                    top_k=10,
                    score_threshold=0.15,
                )
                parts = []
                for hit in hits:
                    hit_user_id = hit.get("user_id")
                    category = hit.get("category")
                    source = hit.get("source", "qdrant")
                    text = (hit.get("chunk_text") or "").strip()
                    if not text:
                        continue
                    if hit_user_id and user_id and hit_user_id != user_id:
                        continue
                    if extra_context and category == "patient_upload" and hit_user_id == user_id:
                        continue
                    parts.append(f"[Qdrant: {source}]\n{text}")
                if parts:
                    qdrant_context = "\n\n".join(parts[:4])
            except Exception as search_exc:
                print(f"[WARNING] Qdrant search failed inside rag_engine: {search_exc}")

            user_context = self.get_user_context(user_id)

            conversation_context = ""
            if history:
                parts = []
                for item in history[-8:]:
                    role = item.get("sender") or item.get("role") or "user"
                    text = (item.get("text") or item.get("content") or "").strip()
                    if not text:
                        continue
                    label = "User" if role in ("user", "human") else "Assistant"
                    parts.append(f"{label}: {text}")
                if parts:
                    conversation_context = "=== RECENT CONVERSATION ===\n" + "\n".join(parts) + "\n\n"

            # ── Build system + user prompts depending on whether a document was uploaded ──
            if extra_context:
                # Uploaded document content is available — use both sources but
                # tell the LLM to prioritise the uploaded document for any
                # patient-specific questions and use the knowledge base for
                # general medical context.
                system_prompt = (
                    "You are ThyroRAG, a medical assistant specialising in thyroid health. "
                    "You have two sources of information:\n"
                    "1. An UPLOADED DOCUMENT (lab report / patient file) — treat this as ground truth for patient-specific questions.\n"
                    "2. A THYROID KNOWLEDGE BASE containing reference data, past cases, and medical guidelines.\n\n"
                    "Rules:\n"
                    "- For questions about 'my report', 'my results', 'what does it say', specific names/values from the report: "
                    "answer ONLY from the uploaded document. Do NOT mix in training dataset patients.\n"
                    "- If the user asks to extract patient details from the uploaded file, list each patient separately and quote the values from the uploaded document.\n"
                    "- For general thyroid questions (symptoms, treatments, what TSH means, etc.): "
                    "use the knowledge base alongside the uploaded document for context.\n"
                    "- Always present lab values exactly as they appear in the uploaded document.\n"
                    "- Always recommend consulting a qualified healthcare professional."
                )
                user_prompt = (
                    f"{conversation_context}"
                    f"=== UPLOADED DOCUMENT (Primary Source) ===\n{extra_context}\n\n"
                    f"=== THYROID KNOWLEDGE BASE (Reference) ===\n{user_context}{qdrant_context}\n\n"
                    f"User question: {query}\n\nAnswer:"
                )
            else:
                # No uploaded document — answer from knowledge base only
                system_prompt = (
                    "You are ThyroRAG, a medical assistant specializing in thyroid health. "
                    "Answer the user's question using the provided context. "
                    "If the context doesn't contain the answer, provide a helpful general answer based on medical knowledge. "
                    "Always recommend consulting a qualified healthcare professional."
                )
                user_prompt = (
                    f"{conversation_context}"
                    f"Context:\n{user_context}{qdrant_context}\n\n"
                    f"Question: {query}\n\nAnswer:"
                )

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            }
            data = {
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "temperature": 0.2,
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
