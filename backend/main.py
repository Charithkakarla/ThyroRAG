from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
import os
import io
import csv
import json
from RAG.rag_engine import rag_engine
from supabase_client import supabase
from auth.auth_routes import router as auth_router
from auth.auth_middleware import get_current_user
from routes.rag_routes import router as qdrant_rag_router
from vector_db.document_ingestion import ingestion_service as qdrant_ingestion

# Directory where uploaded patient files are persisted for RAG retrieval
_UPLOAD_DIR = Path(__file__).parent / "RAG" / "uploaded_files"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── FastAPI App ──────────────────────────────────────────────────
app = FastAPI(
    title="ThyroRAG API",
    description="Thyroid disease prediction & RAG chatbot. "
                "Vector search powered by Qdrant + sentence-transformers.",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
# Qdrant-based RAG endpoints: /rag/ingest-documents, /rag/query, etc.
app.include_router(qdrant_rag_router)

# ── Request Schemas ──────────────────────────────────────────────
class ThyroidFeatures(BaseModel):
    # Patient identity (not used in ML model, stored for records)
    full_name: str = Field(default="", example="Jane Doe")
    dob: str = Field(default="", example="1979-03-15")
    age: float = Field(..., example=45.0)
    sex: str = Field(..., example="F")
    weight: float = Field(default=70.0, example=70.0)
    on_thyroxine: str = Field(default="f")
    query_on_thyroxine: str = Field(default="f")
    on_antithyroid_medication: str = Field(default="f")
    sick: str = Field(default="f")
    pregnant: str = Field(default="f")
    thyroid_surgery: str = Field(default="f")
    I131_treatment: str = Field(default="f")
    query_hypothyroid: str = Field(default="f")
    query_hyperthyroid: str = Field(default="f")
    lithium: str = Field(default="f")
    goitre: str = Field(default="f")
    tumor: str = Field(default="f")
    hypopituitary: str = Field(default="f")
    psych: str = Field(default="f")
    TSH: float = Field(..., example=1.3)
    T3: float = Field(..., example=1.0)
    TT4: float = Field(..., example=104.0)
    T4U: float = Field(..., example=1.1)
    FTI: float = Field(..., example=109.0)
    TBG: float = Field(default=None, example=None)
    referral_source: str = Field(default="other", example="SVI")

class ChatRequest(BaseModel):
    message: str = Field(..., example="What is hypothyroidism?")
    history: list = Field(default=[])

# ── Model Loading ────────────────────────────────────────────────
model = None

@app.on_event("startup")
def load_model():
    global model
    for path in ["../final_model.pkl", "final_model.pkl"]:
        if os.path.exists(path):
            try:
                model = joblib.load(path)
                print(f"[OK] Model loaded from {path}")
                return
            except Exception as e:
                print(f"[ERROR] Failed to load model from {path}: {e}")
    print("[WARNING] final_model.pkl not found.")

@app.get("/")
def health_check():
    return {"status": "online", "model_loaded": model is not None}

# ── Predict Endpoint ─────────────────────────────────────────────
@app.post("/predict")
async def predict(data: ThyroidFeatures, current_user=Depends(get_current_user)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        input_dict = data.dict()
        # Extract patient identity fields (not fed to ML model)
        full_name = input_dict.pop("full_name", "")
        dob = input_dict.pop("dob", "")
        weight = input_dict.pop("weight", None)
        tbg_value = input_dict.pop("TBG", None)
        input_dict.pop("referral_source", None)

        input_df = pd.DataFrame([input_dict])
        prediction = model.predict(input_df)[0]
        if isinstance(prediction, (np.ndarray, list)):
            prediction = prediction[0]

        probabilities = model.predict_proba(input_df)[0].tolist()
        class_mapping = {0: "Negative", 1: "Hypothyroid", 2: "Hyperthyroid"}
        label = class_mapping.get(
            int(prediction) if isinstance(prediction, (int, float, np.integer)) else prediction,
            str(prediction)
        )

        result = {
            "prediction": str(prediction),
            "result_label": label,
            "confidence": max(probabilities),
            "probabilities": {
                "Negative": probabilities[0],
                "Hypothyroid": probabilities[1],
                "Hyperthyroid": probabilities[2],
            },
        }

        # Save prediction to Supabase
        try:
            record = {
                "user_id": current_user.id,
                "age": data.age,
                "sex": data.sex,
                "weight": weight,
                "tsh": data.TSH,
                "t3": data.T3,
                "tt4": data.TT4,
                "t4u": data.T4U,
                "fti": data.FTI,
                "tbg": tbg_value,
                "on_thyroxine": data.on_thyroxine.lower() == "t",
                "query_on_thyroxine": data.query_on_thyroxine.lower() == "t",
                "on_antithyroid_medication": data.on_antithyroid_medication.lower() == "t",
                "sick": data.sick.lower() == "t",
                "pregnant": data.pregnant.lower() == "t",
                "thyroid_surgery": data.thyroid_surgery.lower() == "t",
                "i131_treatment": data.I131_treatment.lower() == "t",
                "query_hypothyroid": data.query_hypothyroid.lower() == "t",
                "query_hyperthyroid": data.query_hyperthyroid.lower() == "t",
                "lithium": data.lithium.lower() == "t",
                "goitre": data.goitre.lower() == "t",
                "tumor": data.tumor.lower() == "t",
                "hypopituitary": data.hypopituitary.lower() == "t",
                "psych": data.psych.lower() == "t",
                "prediction": label,
                "confidence": result["confidence"],
                "prob_negative": probabilities[0],
                "prob_hypothyroid": probabilities[1],
                "prob_hyperthyroid": probabilities[2],
            }
            # Include patient identity if columns exist in Supabase
            if full_name:
                record["full_name"] = full_name
            if dob:
                record["dob"] = dob

            saved = supabase.table("predictions").insert(record).execute()
            if saved.data:
                result["saved_id"] = saved.data[0]["id"]
        except Exception as e:
            print(f"[WARNING] Could not save prediction: {e}")

        # ── Upsert into ChromaDB vector store for RAG ────────────────
        try:
            rag_engine.add_patient_record(
                user_id=current_user.id,
                full_name=full_name or f"User {current_user.id[:8]}",
                age=data.age,
                sex=data.sex,
                tsh=data.TSH,
                t3=data.T3,
                tt4=data.TT4,
                t4u=data.T4U,
                fti=data.FTI,
                on_thyroxine=data.on_thyroxine.lower() == "t",
                sick=data.sick.lower() == "t",
                pregnant=data.pregnant.lower() == "t",
                thyroid_surgery=data.thyroid_surgery.lower() == "t",
                prediction=label,
                confidence=result["confidence"],
                dob=dob,
            )
        except Exception as e:
            print(f"[WARNING] Could not upsert to ChromaDB: {e}")

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# ── File Parse Endpoint ──────────────────────────────────────────
# Column name aliases → canonical form field names
_FIELD_ALIASES = {
    # Patient identity
    "full name": "fullName", "patient name": "fullName", "name": "fullName",
    "fullname": "fullName", "full_name": "fullName",
    "date of birth": "dob", "birth date": "dob", "dob": "dob", "birthdate": "dob",
    # Demographics
    "age": "age", "weight": "weight", "sex": "sex", "gender": "sex",
    # Hormones
    "tsh": "TSH", "thyroid stimulating hormone": "TSH",
    "t3": "T3", "triiodothyronine": "T3",
    "tt4": "TT4", "total thyroxine": "TT4", "t4 total": "TT4",
    "t4u": "T4U", "t4 uptake": "T4U", "t4u uptake": "T4U",
    "fti": "FTI", "free thyroxine index": "FTI",
    "tbg": "TBG", "thyroxine binding globulin": "TBG",
    # Boolean medical history (values: f/t/yes/no/true/false/1/0)
    "on_thyroxine": "on_thyroxine", "on thyroxine": "on_thyroxine",
    "on_antithyroid_medication": "on_antithyroid_medication",
    "query_on_thyroxine": "query_on_thyroxine",
    "sick": "sick", "pregnant": "pregnant",
    "thyroid_surgery": "thyroid_surgery", "thyroid surgery": "thyroid_surgery",
    "i131_treatment": "I131_treatment", "i131 treatment": "I131_treatment",
    "query_hypothyroid": "query_hypothyroid", "query_hyperthyroid": "query_hyperthyroid",
    "lithium": "lithium", "goitre": "goitre", "tumor": "tumor",
    "hypopituitary": "hypopituitary", "psych": "psych",
    "tsh_measured": "TSH_measured", "t3_measured": "T3_measured",
    "tt4_measured": "TT4_measured", "t4u_measured": "T4U_measured",
    "fti_measured": "FTI_measured", "tbg_measured": "TBG_measured",
    "referral_source": "referral_source",
}

def _normalize_bool(val: str) -> str:
    """Convert various boolean representations to 'Yes'/'No'."""
    v = str(val).strip().lower()
    if v in ("t", "true", "yes", "1"):
        return "Yes"
    return "No"

def _parse_row_to_fields(row: dict) -> dict:
    """Map a dict (from CSV row or JSON) to canonical form fields."""
    result = {}
    bool_fields = {
        "on_thyroxine", "query_on_thyroxine", "on_antithyroid_medication",
        "sick", "pregnant", "thyroid_surgery", "I131_treatment",
        "query_hypothyroid", "query_hyperthyroid", "lithium", "goitre",
        "tumor", "hypopituitary", "psych",
        "TSH_measured", "T3_measured", "TT4_measured",
        "T4U_measured", "FTI_measured", "TBG_measured",
    }
    for raw_key, raw_val in row.items():
        canonical = _FIELD_ALIASES.get(raw_key.strip().lower())
        if not canonical:
            continue
        val = str(raw_val).strip()
        if not val or val.lower() in ("none", "null", "nan", ""):
            continue
        if canonical in bool_fields:
            result[canonical] = _normalize_bool(val)
        else:
            result[canonical] = val
    return result

@app.post("/upload/parse-file")
async def parse_upload_file(file: UploadFile = File(...)):
    """
    Accept a CSV or JSON file containing patient data:
      1. Save the raw file to  RAG/uploaded_files/  for persistent RAG retrieval.
      2. Parse recognised fields and return them so the frontend can auto-fill the
         Diagnosis form.
      3. Ingest a human-readable summary into Qdrant (vector_db) and ChromaDB (RAG)
         so both RAG pipelines can retrieve this patient record during chat.
    """
    original_filename = file.filename or "upload"
    filename_lower = original_filename.lower()
    content = await file.read()

    # ── 1. Persist the raw file to RAG/uploaded_files/ ───────────────────────
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp_str}_{original_filename.replace(' ', '_')}"
    save_path = _UPLOAD_DIR / safe_name
    save_path.write_bytes(content)
    print(f"[OK] Uploaded file saved → {save_path}")

    # ── 2. Parse fields for form auto-fill ───────────────────────────────────
    try:
        if filename_lower.endswith(".json"):
            raw = json.loads(content.decode("utf-8"))
            if isinstance(raw, list):
                raw = raw[0] if raw else {}
            fields = _parse_row_to_fields(raw)

        elif filename_lower.endswith(".csv"):
            text = content.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            if not rows:
                raise HTTPException(status_code=400, detail="CSV file is empty")
            fields = _parse_row_to_fields(rows[0])

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a CSV or JSON file."
            )

        if not fields:
            raise HTTPException(
                status_code=422,
                detail="Could not extract any recognised fields from the file. "
                       "Ensure column headers match expected names (e.g. age, TSH, T3, sex ...)."
            )

        # ── 3. Build a human-readable text summary for vector ingestion ───────
        field_lines = "\n".join(f"  {k}: {v}" for k, v in sorted(fields.items()))
        doc_text = (
            f"Uploaded Patient File: {original_filename}\n"
            f"Uploaded on: {timestamp_str}\n"
            f"Stored at: RAG/uploaded_files/{safe_name}\n"
            f"\nExtracted Fields:\n{field_lines}"
        )
        doc_id = f"upload_{timestamp_str}_{Path(original_filename).stem}"

        # ── 3a. Ingest into Qdrant vector DB ──────────────────────────────────
        try:
            qdrant_ingestion.ingest_document(
                text=doc_text,
                source=f"RAG/uploaded_files/{safe_name}",
                document_id=doc_id,
                extra_metadata={
                    "category": "patient_upload",
                    "original_filename": original_filename,
                    "saved_filename": safe_name,
                },
            )
            print(f"[OK] File '{safe_name}' ingested into Qdrant")
        except Exception as qe:
            print(f"[WARNING] Qdrant ingestion skipped: {qe}")

        # ── 3b. Ingest into ChromaDB via existing RAG engine ──────────────────
        try:
            from langchain.docstore.document import Document as LCDocument
            lc_doc = LCDocument(
                page_content=doc_text,
                metadata={
                    "source": f"RAG/uploaded_files/{safe_name}",
                    "document_id": doc_id,
                    "category": "patient_upload",
                    "original_filename": original_filename,
                },
            )
            if rag_engine.vectorstore:
                rag_engine.vectorstore.add_documents([lc_doc])
                print(f"[OK] File '{safe_name}' ingested into ChromaDB")
        except Exception as ce:
            print(f"[WARNING] ChromaDB ingestion skipped: {ce}")

        return {
            "fields": fields,
            "status": "ok",
            "saved_as": safe_name,
            "rag_indexed": True,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File parse error: {str(e)}")

# ── Chat Endpoint ────────────────────────────────────────────────
@app.post("/chat")
async def chat(request: ChatRequest, current_user=Depends(get_current_user)):
    response_text = rag_engine.get_response(request.message)

    # Save query to Supabase
    try:
        supabase.table("queries").insert({
            "user_id": current_user.id,
            "question": request.message,
            "answer": response_text,
        }).execute()
    except Exception as e:
        print(f"[WARNING] Could not save query: {e}")

    return {"message": response_text, "status": "success"}

# ── History Endpoints ────────────────────────────────────────────
@app.get("/predictions/history")
async def get_prediction_history(limit: int = 10, current_user=Depends(get_current_user)):
    try:
        resp = (
            supabase.table("predictions")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"predictions": resp.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving predictions: {str(e)}")

@app.get("/queries/history")
async def get_query_history(limit: int = 20, current_user=Depends(get_current_user)):
    try:
        resp = (
            supabase.table("queries")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"queries": resp.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving queries: {str(e)}")

@app.get("/profile")
async def get_profile(current_user=Depends(get_current_user)):
    try:
        resp = (
            supabase.table("profiles")
            .select("*")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        return resp.data or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving profile: {str(e)}")

@app.patch("/profile")
async def update_profile(updates: dict, current_user=Depends(get_current_user)):
    try:
        resp = (
            supabase.table("profiles")
            .update(updates)
            .eq("id", current_user.id)
            .execute()
        )
        return resp.data[0] if resp.data else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
