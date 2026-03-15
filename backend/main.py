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
import re
import requests as _requests
from RAG.rag_engine import rag_engine
from supabase_client import supabase
from auth.auth_routes import router as auth_router
from auth.auth_middleware import get_current_user
from routes.rag_routes import router as qdrant_rag_router
from vector_db.document_ingestion import ingestion_service as qdrant_ingestion
from vector_db.tika_service import extract_text as tika_extract_text
from vector_db.vector_search import vector_search_service

# ── Groq / imputation constants ──────────────────────────────────────────────
_GROQ_API_KEY  = os.getenv("GROQ_API_KEY")
_GROQ_MODEL    = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_GROQ_API_BASE = "https://api.groq.com/openai/v1"

# Approximate dataset medians used to impute missing lab values at prediction time
_FEATURE_DEFAULTS = {
    "TSH": 1.3,
    "T3":  1.7,
    "TT4": 105.0,
    "T4U": 0.95,
    "FTI": 110.0,
}

_CLINICAL_RANGES = {
    "TSH": (0.4, 4.0),
    "TT4": (5.0, 12.0),
    "FTI": (6.0, 10.5),
}

_ALLOWED_FIELDS = {
    "fullName", "dob", "age", "sex", "weight",
    "TSH", "T3", "TT4", "T4U", "FTI", "TBG", "FT3", "FT4",
    "on_thyroxine", "on_antithyroid_medication", "thyroid_surgery",
    "I131_treatment", "sick", "pregnant", "goitre",
    "tumor", "lithium", "psych", "referral_source",
    "report_date",
}
# Map any case variation Groq might return for hormone fields → canonical uppercase key
_HORMONE_NORMALIZE = {
    k.lower(): k for k in ("TSH", "T3", "TT4", "T4U", "FTI", "TBG", "FT3", "FT4")
}
_BOOL_EXTRACT = {
    "on_thyroxine", "on_antithyroid_medication", "thyroid_surgery",
    "I131_treatment", "sick", "pregnant", "goitre",
    "tumor", "lithium", "psych",
}


def _normalize_report_date(value: str) -> str:
    raw = str(value).strip()
    if not raw:
        return ""

    # Keep pure ISO date as-is
    try:
        return datetime.fromisoformat(raw).date().isoformat()
    except Exception:
        pass

    # Common report formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, YYYY/MM/DD
    date_formats = [
        "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
        "%Y/%m/%d", "%Y-%m-%d", "%d %b %Y", "%d %B %Y",
        "%b %d, %Y", "%B %d, %Y",
    ]
    for fmt in date_formats:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except Exception:
            continue

    match = re.search(r"(\d{4}-\d{2}-\d{2})", raw)
    if match:
        return match.group(1)

    return ""


def _rule_based_extract_fields(text: str) -> dict:
    """Regex-based fallback extractor when LLM parsing misses lab fields."""
    if not text or not text.strip():
        return {}

    extracted = {}
    compact = re.sub(r"\s+", " ", text)

    # Patient name extraction from common report labels
    name_match = re.search(
        r"patient\s*name\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'/-]{2,80})",
        compact,
        flags=re.IGNORECASE,
    )
    if name_match:
        candidate_name = name_match.group(1).split("(")[0].strip(" :-")
        if candidate_name and candidate_name.lower() not in ("male", "female", "self"):
            extracted["fullName"] = candidate_name

    # Sex extraction from explicit labels or shorthand in brackets like (SIP/F)
    sex_match = re.search(r"(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)\b", compact, flags=re.IGNORECASE)
    if sex_match:
        token = sex_match.group(1).strip().upper()
        extracted["sex"] = "M" if token in ("M", "MALE") else "F"
    else:
        shorthand_match = re.search(r"\(([A-Za-z]{1,8})\s*/\s*([MF])\)", compact, flags=re.IGNORECASE)
        if shorthand_match:
            extracted["sex"] = shorthand_match.group(2).upper()

    # Report/Test date extraction
    date_label_match = re.search(
        r"(?:report\s*date|test\s*date|collection\s*date|sample\s*date|date\s*of\s*test)\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2}|[A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})",
        compact,
        flags=re.IGNORECASE,
    )
    if date_label_match:
        normalized = _normalize_report_date(date_label_match.group(1))
        if normalized:
            extracted["report_date"] = normalized

    analyte_patterns = {
        "TSH": [r"\bTSH\b", r"thyroid\s*stimulating\s*hormone"],
        "T3": [r"\bT3\b", r"total\s*T3", r"triiodothyronine"],
        "TT4": [r"\bTT4\b", r"total\s*T4", r"total\s*thyroxine"],
        "FT3": [r"\bFT3\b", r"free\s*T3"],
        "FT4": [r"\bFT4\b", r"free\s*T4"],
        "T4U": [r"\bT4U\b", r"T4\s*uptake", r"T3\s*uptake"],
        "FTI": [r"\bFTI\b", r"free\s*thyroxine\s*index"],
        "TBG": [r"\bTBG\b", r"thyroxine\s*binding\s*globulin"],
    }

    number_pattern = r"([0-9]+(?:\.[0-9]+)?)"
    for field, labels in analyte_patterns.items():
        if field in extracted:
            continue
        for label in labels:
            # Try immediate value patterns like "TSH: 5.82" or "Free T4 1.2"
            direct = re.search(rf"{label}\s*[:=\-]?\s*{number_pattern}", compact, flags=re.IGNORECASE)
            if direct:
                extracted[field] = direct.group(1)
                break

            # Try row-like patterns where value appears after spaces/tabs
            row_like = re.search(rf"{label}.{{0,120}}?{number_pattern}", compact, flags=re.IGNORECASE)
            if row_like:
                extracted[field] = row_like.group(1)
                break

    # Line-level fallback for tabular rows like:
    # TSH - ULTRASENSITIVE ... 2.00  µIU/mL  0.54-5.30
    if "TSH" not in extracted:
        for line in text.splitlines():
            if re.search(r"\bTSH\b", line, flags=re.IGNORECASE):
                by_unit = re.search(
                    r"([0-9]+(?:\.[0-9]+)?)\s*(?:µ?IU|mIU|uIU)\s*/?\s*(?:mL|L)",
                    line,
                    flags=re.IGNORECASE,
                )
                if by_unit:
                    extracted["TSH"] = by_unit.group(1)
                    break
                numbers = re.findall(r"[0-9]+(?:\.[0-9]+)?", line)
                if numbers:
                    extracted["TSH"] = numbers[0]
                    break

    return extracted


def _normalize_probs(values) -> np.ndarray:
    arr = np.array(values, dtype=float)
    arr = np.clip(arr, 1e-9, None)
    total = float(arr.sum())
    if total <= 0:
        return np.array([1 / 3, 1 / 3, 1 / 3], dtype=float)
    return arr / total


def _apply_clinical_consistency(input_dict: dict, model_probs: list[float]) -> list[float]:
    """
    Blend model probabilities with a lightweight clinical prior built from
    key thyroid labs + symptom flags, then sharpen and re-normalize.
    Class order: [Negative, Hypothyroid, Hyperthyroid]
    """
    base = _normalize_probs(model_probs)
    prior = np.array([0.34, 0.33, 0.33], dtype=float)

    def _safe_float(value):
        try:
            parsed = float(value)
            return None if np.isnan(parsed) else parsed
        except (TypeError, ValueError):
            return None

    def _is_true_flag(key: str) -> bool:
        return str(input_dict.get(key, "f")).strip().lower() in ("t", "true", "yes", "1")

    tsh = _safe_float(input_dict.get("TSH"))
    tt4 = _safe_float(input_dict.get("TT4"))
    fti = _safe_float(input_dict.get("FTI"))

    # TSH is the strongest single thyroid classifier signal.
    if tsh is not None:
        tsh_low, tsh_high = _CLINICAL_RANGES["TSH"]
        if tsh > tsh_high:
            prior += np.array([0.05, 0.65, 0.05])
        elif tsh < tsh_low:
            prior += np.array([0.05, 0.05, 0.65])
        else:
            prior += np.array([0.60, 0.18, 0.18])

    # Secondary hormonal support.
    if tt4 is not None:
        tt4_low, tt4_high = _CLINICAL_RANGES["TT4"]
        if tt4 < tt4_low:
            prior += np.array([0.02, 0.22, 0.02])
        elif tt4 > tt4_high:
            prior += np.array([0.02, 0.02, 0.22])

    if fti is not None:
        fti_low, fti_high = _CLINICAL_RANGES["FTI"]
        if fti < fti_low:
            prior += np.array([0.02, 0.22, 0.02])
        elif fti > fti_high:
            prior += np.array([0.02, 0.02, 0.22])

    # Symptom/history nudges.
    if _is_true_flag("query_hypothyroid"):
        prior += np.array([0.03, 0.20, 0.00])
    if _is_true_flag("query_hyperthyroid"):
        prior += np.array([0.03, 0.00, 0.20])
    if _is_true_flag("on_thyroxine"):
        prior += np.array([0.02, 0.10, 0.00])
    if _is_true_flag("on_antithyroid_medication"):
        prior += np.array([0.02, 0.00, 0.10])
    if _is_true_flag("goitre"):
        prior += np.array([0.00, 0.06, 0.06])

    prior = _normalize_probs(prior)

    # Blend model + clinical prior. Keep model dominant, but force sanity.
    blended = 0.68 * base + 0.32 * prior
    blended = _normalize_probs(np.power(blended, 1.25))
    return blended.tolist()


def _groq_extract_fields(text: str) -> dict:
    """
    Ask the Groq LLM to extract thyroid lab values and demographics from
    unstructured medical-report text.  Returns a dict of canonical form-field
    names ready to be returned to the frontend for auto-fill.
    """
    if not _GROQ_API_KEY or not text.strip():
        return {}

    # Send up to 10000 chars; trim at a line boundary so we don't cut mid-value
    text_chunk = text[:10000]
    if len(text) > 10000:
        last_nl = text_chunk.rfind("\n", 0, 10000)
        if last_nl > 5000:
            text_chunk = text_chunk[:last_nl]

    system_prompt = (
        "You are a medical-data extraction specialist. "
        "Your task is to read laboratory reports, clinical notes, or patient records "
        "and return ONLY a valid JSON object with the extracted values. "
        "No markdown, no explanation, no extra text — raw JSON only."
    )

    user_prompt = (
        "Extract ALL available patient information from the medical text below.\n"
        "Return a flat JSON object using ONLY these exact keys (omit any key whose value is not present):\n\n"
        "  Identity     : fullName (string), dob (YYYY-MM-DD), age (integer), sex ('M' or 'F'), weight (number, kg)\n"
        "  Report date  : report_date (YYYY-MM-DD) - the lab test/report date if present\n"
        "  Lab hormones : TSH, T3, TT4, T4U, FTI, TBG, FT3, FT4  — all plain numbers (strip units/ranges)\n"
        "  Medical flags: on_thyroxine, on_antithyroid_medication, thyroid_surgery, I131_treatment,\n"
        "                  sick, pregnant, goitre, tumor, lithium, psych  — each exactly 'Yes' or 'No'\n"
        "  Referral     : referral_source (string, one of: SVI, SVHC, SVHD, STMW, other)\n\n"
        "Rules:\n"
        "  - Strip unit suffixes from numbers: '2.50 mIU/L' → 2.50\n"
        "  - If a value appears as a range like '2.50 (0.40-4.00)' extract just '2.50'\n"
        "  - OCR sometimes drops decimal points: '582' next to a reference range '0.54-5.30' means the real value is '5.82' — use the reference range to recover the decimal\n"
        "  - Typical TSH range is 0.1–10 mIU/L; T3 is 0.5–3.0; TT4 is 4–14; T4U is 0.7–1.3; FTI is 4–14\n"
        "  - If an extracted hormone value is far outside typical range and has no decimal, try inserting a decimal (e.g. '582' → '5.82')\n"
        "  - For sex: accept Male/Female/M/F/male/female → return 'M' or 'F'\n"
        "  - For boolean flags: Yes/No/Y/N/true/false/1/0/positive/negative → 'Yes' or 'No'\n"
        "  - If the report mentions a patient is 'on levothyroxine' or 'on synthroid' → on_thyroxine: Yes\n"
        "  - If the report mentions 'thyroidectomy' → thyroid_surgery: Yes\n"
        "  - Dates: convert to YYYY-MM-DD format if possible\n"
        "  - Do NOT invent values — only extract what is explicitly stated\n\n"
        f"Medical report:\n{text_chunk}\n\nJSON:"
    )

    try:
        resp = _requests.post(
            f"{_GROQ_API_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {_GROQ_API_KEY}",
            },
            json={
                "model": _GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "temperature": 0.0,
                "max_tokens": 1024,
            },
            timeout=30,
        )
        if resp.status_code != 200:
            print(f"[WARNING] Groq extraction API error {resp.status_code}: {resp.text[:300]}")
            return {}
        raw = resp.json()["choices"][0]["message"]["content"]
        # Strip any accidental markdown fences
        cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        # If there's prose before the JSON object, pull out just the JSON
        brace_start = cleaned.find("{")
        if brace_start > 0:
            cleaned = cleaned[brace_start:]
        groq_data = json.loads(cleaned)
    except json.JSONDecodeError as jde:
        print(f"[WARNING] Groq returned non-JSON, trying regex recovery: {jde}")
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                groq_data = json.loads(match.group())
            except Exception:
                return {}
        else:
            return {}
    except Exception as exc:
        print(f"[WARNING] Groq field extraction failed: {exc}")
        return {}

    # Validate and normalise keys
    result = {}
    for key, val in groq_data.items():
        # 1. Normalize hormone casing: 'tsh' → 'TSH', 't4u' → 'T4U', etc.
        canonical_key = _HORMONE_NORMALIZE.get(key.strip().lower(), key.strip())
        # 2. If still not in allowed set, try _FIELD_ALIASES for any other variation
        if canonical_key not in _ALLOWED_FIELDS:
            canonical_key = _FIELD_ALIASES.get(key.strip().lower(), canonical_key)
        if canonical_key not in _ALLOWED_FIELDS:
            continue
        s = str(val).strip()
        if not s or s.lower() in ("none", "null", "n/a", "na", ""):
            continue
        if canonical_key in _BOOL_EXTRACT:
            result[canonical_key] = _normalize_bool(s)
        elif canonical_key == "sex":
            normalized_sex = s.strip().upper()
            if normalized_sex in ("M", "MALE"):
                result[canonical_key] = "M"
            elif normalized_sex in ("F", "FEMALE"):
                result[canonical_key] = "F"
            else:
                continue
        elif canonical_key == "fullName":
            cleaned_name = re.sub(r"\s+", " ", s).strip(" :-")
            if cleaned_name.lower() in ("f", "m", "female", "male", "self", "na", "n/a", "nil"):
                continue
            result[canonical_key] = cleaned_name
        elif canonical_key in ("TSH", "T3", "TT4", "T4U", "FTI", "TBG", "FT3", "FT4", "age", "weight"):
            # Strip any remaining units or range suffixes like "(0.4-4.0)"
            numeric_str = re.match(r"[\d.]+", s.replace(",", "."))
            if numeric_str:
                result[canonical_key] = numeric_str.group()
        elif canonical_key == "report_date":
            normalized_report_date = _normalize_report_date(s)
            if normalized_report_date:
                result[canonical_key] = normalized_report_date
        else:
            result[canonical_key] = s

    print(f"[INFO] Groq extracted {len(result)} fields: {list(result.keys())}")
    return result


def _groq_predict_interpretation(
    label: str, confidence: float, probabilities: dict,
    age=None, sex=None, tsh=None, t3=None, tt4=None, t4u=None, fti=None,
    on_thyroxine="f", on_antithyroid_medication="f", thyroid_surgery="f",
    i131_treatment="f", sick="f", pregnant="f",
    goitre="f", tumor="f", lithium="f", psych="f",
) -> dict:
    """Ask Groq for a plain-English clinical interpretation of the ML prediction.
    Returns {"interpretation": str, "key_reasons": list[str]}.
    Falls back to empty values silently on any failure.
    """
    if not _GROQ_API_KEY:
        return {"interpretation": "", "key_reasons": []}

    def _tf(v):
        return str(v).strip().lower() in ("t", "true", "yes", "1")

    lab_parts = []
    if tsh  is not None: lab_parts.append(f"TSH = {tsh} mIU/L (normal 0.4\u20134.0)")
    if t3   is not None: lab_parts.append(f"T3 = {t3} ng/mL (normal 0.8\u20132.0)")
    if tt4  is not None: lab_parts.append(f"TT4 = {tt4} \u00b5g/dL (normal 5\u201312)")
    if t4u  is not None: lab_parts.append(f"T4U = {t4u} (normal 0.85\u20131.15)")
    if fti  is not None: lab_parts.append(f"FTI = {fti} (normal 6\u201310.5)")

    history = [k for k, v in {
        "on thyroxine medication": on_thyroxine,
        "on antithyroid medication": on_antithyroid_medication,
        "previous thyroid surgery": thyroid_surgery,
        "I131 treatment": i131_treatment,
        "currently sick": sick,
        "pregnant": pregnant,
        "goitre": goitre,
        "tumor": tumor,
        "taking lithium": lithium,
        "psychiatric history": psych,
    }.items() if _tf(v)]

    prob_ctx = (
        f"Negative {probabilities.get('Negative', 0)*100:.1f}%, "
        f"Hypothyroid {probabilities.get('Hypothyroid', 0)*100:.1f}%, "
        f"Hyperthyroid {probabilities.get('Hyperthyroid', 0)*100:.1f}%"
    )
    patient_ctx = ", ".join(filter(None, [
        f"Age {age}" if age else None,
        f"Sex {'Male' if str(sex).upper() == 'M' else 'Female'}" if sex else None,
    ])) or "demographics not provided"
    lab_ctx = ", ".join(lab_parts) or "No lab values provided (median imputation used)"
    hist_ctx = ", ".join(history) or "None reported"

    system_prompt = (
        "You are a board-certified endocrinologist. "
        "Provide a concise, evidence-based clinical interpretation. "
        "Respond ONLY in raw JSON with no markdown fences."
    )
    user_prompt = (
        f"ML prediction: {label} (confidence {confidence*100:.1f}%).\n"
        f"Class probabilities: {prob_ctx}\n"
        f"Patient: {patient_ctx}\n"
        f"Lab values: {lab_ctx}\n"
        f"Medical history: {hist_ctx}\n\n"
        "Return JSON exactly:\n"
        '{"interpretation": "<2-3 sentence clinical explanation of why these values led to this diagnosis>", '
        '"key_reasons": ["<reason 1>", "<reason 2>", "<reason 3>", "<reason 4>", "<reason 5>"]}\n\n'
        "In key_reasons list 4-5 specific clinical factors driving the prediction. "
        "If lab values were imputed from medians, note that results are indicative only. Raw JSON only."
    )

    try:
        resp = _requests.post(
            f"{_GROQ_API_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {_GROQ_API_KEY}",
            },
            json={
                "model": _GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 600,
            },
            timeout=20,
        )
        if resp.status_code != 200:
            return {"interpretation": "", "key_reasons": []}
        raw = resp.json()["choices"][0]["message"]["content"]
        cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        parsed = json.loads(cleaned)
        return {
            "interpretation": parsed.get("interpretation", ""),
            "key_reasons": parsed.get("key_reasons", []),
        }
    except Exception as exc:
        print(f"[WARNING] Groq interpretation failed: {exc}")
        return {"interpretation": "", "key_reasons": []}


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
    age: Optional[float] = Field(default=None, example=45.0)
    sex: str = Field(default="F", example="F")
    weight: Optional[float] = Field(default=None, example=70.0)
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
    TSH: Optional[float] = Field(default=None, example=1.3)
    T3:  Optional[float] = Field(default=None, example=1.0)
    TT4: Optional[float] = Field(default=None, example=104.0)
    T4U: Optional[float] = Field(default=None, example=1.1)
    FTI: Optional[float] = Field(default=None, example=109.0)
    TBG: Optional[float] = Field(default=None, example=None)
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
        # NOTE: referral_source must stay in input_dict — the model was trained with it at index 21

        def _is_missing(value):
            return value is None or (isinstance(value, (float, np.floating)) and np.isnan(value))

        # Impute missing lab values with dataset medians so the model can still
        # run when only a subset of features was extracted from an uploaded report.
        if _is_missing(input_dict.get("age")):
            input_dict["age"] = 50.0
        for _field, _default in _FEATURE_DEFAULTS.items():
            if _is_missing(input_dict.get(_field)):
                input_dict[_field] = _default

        # Normalize boolean string fields to "t"/"f" (the values the model was
        # trained on) regardless of whether the frontend sent "Yes"/"No"/"t"/"f".
        _BOOL_FIELDS = [
            "on_thyroxine", "query_on_thyroxine", "on_antithyroid_medication",
            "sick", "pregnant", "thyroid_surgery", "I131_treatment",
            "query_hypothyroid", "query_hyperthyroid", "lithium", "goitre",
            "tumor", "hypopituitary", "psych",
        ]
        for _bf in _BOOL_FIELDS:
            raw = str(input_dict.get(_bf, "f")).strip().lower()
            input_dict[_bf] = "t" if raw in ("t", "true", "yes", "1") else "f"

        input_df = pd.DataFrame([input_dict])
        prediction = model.predict(input_df)[0]
        if isinstance(prediction, (np.ndarray, list)):
            prediction = prediction[0]

        raw_probabilities = model.predict_proba(input_df)[0].tolist()
        probabilities = _apply_clinical_consistency(input_dict, raw_probabilities)
        class_mapping = {0: "Negative", 1: "Hypothyroid", 2: "Hyperthyroid"}
        final_class_index = int(np.argmax(probabilities))
        label = class_mapping.get(final_class_index, "Negative")

        result = {
            "prediction": str(final_class_index),
            "result_label": label,
            "confidence": max(probabilities),
            "probabilities": {
                "Negative": probabilities[0],
                "Hypothyroid": probabilities[1],
                "Hyperthyroid": probabilities[2],
            },
            "raw_probabilities": {
                "Negative": raw_probabilities[0],
                "Hypothyroid": raw_probabilities[1],
                "Hyperthyroid": raw_probabilities[2],
            },
        }

        # ── Groq clinical interpretation ─────────────────────────────────
        groq_interp = _groq_predict_interpretation(
            label=label, confidence=result["confidence"],
            probabilities=result["probabilities"],
            age=data.age, sex=data.sex,
            tsh=data.TSH, t3=data.T3, tt4=data.TT4, t4u=data.T4U, fti=data.FTI,
            on_thyroxine=data.on_thyroxine,
            on_antithyroid_medication=data.on_antithyroid_medication,
            thyroid_surgery=data.thyroid_surgery,
            i131_treatment=data.I131_treatment,
            sick=data.sick, pregnant=data.pregnant,
            goitre=data.goitre, tumor=data.tumor,
            lithium=data.lithium, psych=data.psych,
        )
        result["clinical_interpretation"] = groq_interp["interpretation"]
        result["key_reasons"] = groq_interp["key_reasons"]

        # Save prediction to Supabase
        # Helper: accept t/f/Yes/No/true/false/1/0 → Python bool
        _b = lambda v: str(v).strip().lower() in ("t", "true", "yes", "1")
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
                "on_thyroxine": _b(data.on_thyroxine),
                "query_on_thyroxine": _b(data.query_on_thyroxine),
                "on_antithyroid_medication": _b(data.on_antithyroid_medication),
                "sick": _b(data.sick),
                "pregnant": _b(data.pregnant),
                "thyroid_surgery": _b(data.thyroid_surgery),
                "i131_treatment": _b(data.I131_treatment),
                "query_hypothyroid": _b(data.query_hypothyroid),
                "query_hyperthyroid": _b(data.query_hyperthyroid),
                "lithium": _b(data.lithium),
                "goitre": _b(data.goitre),
                "tumor": _b(data.tumor),
                "hypopituitary": _b(data.hypopituitary),
                "psych": _b(data.psych),
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

        # ── Upsert into Qdrant for future chat retrieval ─────────────
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
            print(f"[WARNING] Could not upsert to Qdrant: {e}")

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# ── File Parse Endpoint ──────────────────────────────────────────
# Column name aliases → canonical form field names
_FIELD_ALIASES = {
    # Patient identity
    "full name": "fullName", "patient name": "fullName", "name": "fullName",
    "fullname": "fullName", "full_name": "fullName", "patient": "fullName",
    "date of birth": "dob", "birth date": "dob", "dob": "dob", "birthdate": "dob",
    "date_of_birth": "dob", "birth_date": "dob",
    "report date": "report_date", "test date": "report_date", "lab date": "report_date",
    "sample date": "report_date", "collection date": "report_date", "date of test": "report_date",
    # Demographics
    "age": "age", "age (years)": "age", "age(years)": "age", "patient age": "age",
    "weight": "weight", "weight (kg)": "weight", "body weight": "weight", "wt": "weight",
    "sex": "sex", "gender": "sex", "patient sex": "sex", "patient gender": "sex",
    # Hormones — many real-lab spellings
    "tsh": "TSH", "thyroid stimulating hormone": "TSH", "thyroid-stimulating hormone": "TSH",
    "tsh level": "TSH", "tsh value": "TSH", "serum tsh": "TSH",
    "t3": "T3", "triiodothyronine": "T3", "t3 level": "T3", "total t3": "T3",
    "serum t3": "T3", "t3 (total)": "T3",
    "ft3": "FT3", "free t3": "FT3", "free triiodothyronine": "FT3",
    "tt4": "TT4", "total thyroxine": "TT4", "t4 total": "TT4", "total t4": "TT4",
    "t4": "TT4", "thyroxine": "TT4", "serum t4": "TT4", "t4 level": "TT4",
    "ft4": "FT4", "free t4": "FT4", "free thyroxine": "FT4",
    "t4u": "T4U", "t4 uptake": "T4U", "t4u uptake": "T4U", "t4 resin uptake": "T4U",
    "resin t4 uptake": "T4U", "t3 uptake": "T4U",
    "fti": "FTI", "free thyroxine index": "FTI", "free t4 index": "FTI",
    "tbg": "TBG", "thyroxine binding globulin": "TBG", "tbg level": "TBG",
    # Boolean medical history
    "on_thyroxine": "on_thyroxine", "on thyroxine": "on_thyroxine",
    "thyroxine": "on_thyroxine", "levothyroxine": "on_thyroxine",
    "on_antithyroid_medication": "on_antithyroid_medication",
    "antithyroid medication": "on_antithyroid_medication",
    "antithyroid": "on_antithyroid_medication",
    "query_on_thyroxine": "query_on_thyroxine",
    "sick": "sick", "currently sick": "sick",
    "pregnant": "pregnant", "pregnancy": "pregnant",
    "thyroid_surgery": "thyroid_surgery", "thyroid surgery": "thyroid_surgery",
    "thyroidectomy": "thyroid_surgery",
    "i131_treatment": "I131_treatment", "i131 treatment": "I131_treatment",
    "radioiodine": "I131_treatment", "radioactive iodine": "I131_treatment",
    "query_hypothyroid": "query_hypothyroid", "query_hyperthyroid": "query_hyperthyroid",
    "lithium": "lithium", "on lithium": "lithium",
    "goitre": "goitre", "goiter": "goitre", "enlarged thyroid": "goitre",
    "tumor": "tumor", "tumour": "tumor", "thyroid tumor": "tumor",
    "hypopituitary": "hypopituitary", "hypopituitarism": "hypopituitary",
    "psych": "psych", "psychiatric": "psych", "psychiatric history": "psych",
    "tsh_measured": "TSH_measured", "t3_measured": "T3_measured",
    "tt4_measured": "TT4_measured", "t4u_measured": "T4U_measured",
    "fti_measured": "FTI_measured", "tbg_measured": "TBG_measured",
    "referral_source": "referral_source", "referral source": "referral_source",
    "referred by": "referral_source",
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
        elif canonical == "report_date":
            normalized_report_date = _normalize_report_date(val)
            if normalized_report_date:
                result[canonical] = normalized_report_date
        else:
            result[canonical] = val
    return result

@app.post("/upload/parse-file")
async def parse_upload_file(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    """
    Accept a CSV or JSON file containing patient data:
      1. Save the raw file to  RAG/uploaded_files/  for persistent RAG retrieval.
      2. Parse recognised fields and return them so the frontend can auto-fill the
         Diagnosis form.
        3. Ingest a human-readable summary into Qdrant so uploaded patient files
            can be retrieved during chat.
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
    raw_text_for_rag = ""   # will hold the full extracted text for RAG indexing
    try:
        if filename_lower.endswith(".json"):
            raw_json = json.loads(content.decode("utf-8"))
            # Support both single-record dicts and arrays of records
            records = raw_json if isinstance(raw_json, list) else [raw_json]
            if not records:
                raise HTTPException(status_code=400, detail="JSON file is empty")
            fields = _parse_row_to_fields(records[0])
            # Build full-text summary of ALL records for RAG
            raw_text_for_rag = f"Patient data from {original_filename}:\n" + "\n".join(
                json.dumps(r, indent=2) for r in records
            )

        elif filename_lower.endswith(".csv"):
            text = content.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            if not rows:
                raise HTTPException(status_code=400, detail="CSV file is empty")
            fields = _parse_row_to_fields(rows[0])
            # Build full-text summary of ALL rows for RAG indexing
            raw_text_for_rag = f"Patient records from {original_filename}:\n" + text

        else:
            # Any other file type (PDF, DOCX, WEBP, JPG, PNG, …)
            # — use Apache Tika to extract text, then Groq to identify fields
            declared_mime = file.content_type or "application/octet-stream"
            extracted = ""
            tika_error = None
            try:
                extracted = tika_extract_text(content, declared_mime)
            except RuntimeError as te:
                tika_error = str(te)

            # If declared MIME yielded nothing, retry with octet-stream so Tika
            # auto-detects the format (helps with some JPEG/PNG/WEBP edge cases)
            if (not extracted or not extracted.strip()) and declared_mime != "application/octet-stream":
                try:
                    extracted = tika_extract_text(content, "application/octet-stream")
                except RuntimeError:
                    pass

            if tika_error and (not extracted or not extracted.strip()):
                raise HTTPException(
                    status_code=503,
                    detail=(
                        f"Text extraction failed. Make sure Apache Tika is running "
                        f"(docker compose up -d tika). Detail: {tika_error}"
                    ),
                )

            if not extracted or not extracted.strip():
                # OCR returned nothing (e.g. very small image, unusual encoding).
                # Save the file and index it as a named document so the chatbot
                # knows it was uploaded — don't hard-fail the user.
                print(f"[WARNING] Tika returned empty text for '{original_filename}' — falling back to partial index")
                raw_text_for_rag = (
                    f"Uploaded file: {original_filename}\n"
                    f"File type: {declared_mime}\n"
                    f"Uploaded on: {timestamp_str}\n"
                    "[OCR could not extract readable text from this file. "
                    "The file has been saved and can be referenced by filename.]"
                )
                fields = {}
            else:
                raw_text_for_rag = extracted
                print(f"[INFO] Tika extracted {len(extracted)} chars from '{original_filename}'")
                # Use Groq to extract structured fields from the free-text report
                fields = _groq_extract_fields(extracted)
                fallback_fields = _rule_based_extract_fields(extracted)
                for _fk, _fv in fallback_fields.items():
                    if _fk not in fields and str(_fv).strip():
                        fields[_fk] = _fv

        if not fields:
            # For non-CSV/JSON files: if Groq returned no structured fields but
            # raw text was extracted, still ingest the raw text into RAG so the
            # chatbot can answer questions about the document content.
            if raw_text_for_rag and raw_text_for_rag.strip():
                fallback_doc_text = (
                    f"Uploaded Patient File: {original_filename}\n"
                    f"Uploaded on: {timestamp_str}\n"
                    f"Stored at: RAG/uploaded_files/{safe_name}\n"
                    f"\n--- Full Document Content ---\n{raw_text_for_rag[:8000]}"
                )
                fallback_doc_id = f"upload_{timestamp_str}_{Path(original_filename).stem}"
                try:
                    qdrant_ingestion.ingest_document(
                        text=fallback_doc_text,
                        source=f"RAG/uploaded_files/{safe_name}",
                        document_id=fallback_doc_id,
                        extra_metadata={
                            "category": "patient_upload",
                            "original_filename": original_filename,
                            "saved_filename": safe_name,
                            "user_id": current_user.id,
                        },
                    )
                except Exception:
                    pass
                return {
                    "fields": {},
                    "status": "partial",
                    "saved_as": safe_name,
                    "rag_indexed": True,
                    "extracted_preview": raw_text_for_rag[:600],
                    "warning": (
                        "No thyroid form fields were found in the document, but the full "
                        "text has been indexed into the RAG knowledge base so the chatbot "
                        "can answer questions about its contents."
                    ),
                }
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not extract any recognised thyroid fields from this file. "
                    "For CSV/JSON files ensure column headers match expected names "
                    "(e.g. age, TSH, T3, sex\u2026). "
                    "For PDF/images, ensure the document contains readable lab values."
                )
            )

        # ── 3. Build a human-readable text summary for vector ingestion ───────
        field_lines = "\n".join(f"  {k}: {v}" for k, v in sorted(fields.items()))
        # The doc_text stored in the vector DB combines the full raw content
        # (so RAG can answer questions about it) AND the parsed field summary.
        doc_text = (
            f"Uploaded Patient File: {original_filename}\n"
            f"Uploaded on: {timestamp_str}\n"
            f"Stored at: RAG/uploaded_files/{safe_name}\n"
            f"\nExtracted Fields:\n{field_lines}\n"
        )
        if raw_text_for_rag and raw_text_for_rag.strip():
            doc_text += f"\n--- Full Document Content ---\n{raw_text_for_rag[:8000]}"
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
                    "user_id": current_user.id,
                },
            )
            print(f"[OK] File '{safe_name}' ingested into Qdrant")
        except Exception as qe:
            print(f"[WARNING] Qdrant ingestion skipped: {qe}")

        return {
            "fields": fields,
            "status": "ok",
            "saved_as": safe_name,
            "rag_indexed": True,
            "extracted_preview": raw_text_for_rag[:600],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File parse error: {str(e)}")

# ── Chat Endpoint ────────────────────────────────────────────────
@app.post("/chat")
async def chat(request: ChatRequest, current_user=Depends(get_current_user)):
    # Search Qdrant for context from any files the user has uploaded
    qdrant_extra = ""
    try:
        hits = vector_search_service.search(
            query=request.message,
            top_k=8,
            score_threshold=0.18,
            metadata_filter={"user_id": current_user.id},
        )
        if not hits:
            hits = vector_search_service.search(
                query=request.message,
                top_k=5,
                score_threshold=0.0,
                metadata_filter={"user_id": current_user.id},
            )
        # Qdrant holds uploaded docs and any knowledge documents ingested into the collection.
        if hits:
            parts = []
            for h in hits[:5]:
                src = h.get("source", "uploaded file")
                txt = h.get("chunk_text", "")
                score = h.get("score", 0.0)
                if txt.strip():
                    parts.append(f"[From: {src} | relevance: {score:.2%}]\n{txt}")
            if parts:
                qdrant_extra = "=== CONTENT FROM UPLOADED DOCUMENTS ===\n\n" + "\n\n".join(parts)
    except Exception as _exc:
        print(f"[WARNING] Qdrant search in /chat failed: {_exc}")

    response_text = rag_engine.get_response(
        request.message,
        extra_context=qdrant_extra,
        user_id=current_user.id,
        history=request.history,
    )

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
async def get_prediction_history(limit: int = 50, current_user=Depends(get_current_user)):
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
