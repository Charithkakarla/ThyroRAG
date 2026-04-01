# ThyroRAG — AI-Powered Thyroid Disease Detection & Medical Assistant

> A full-stack medical AI application combining a high-accuracy CatBoost ML model for thyroid disease screening with a dual-source Retrieval-Augmented Generation (RAG) chatbot, OCR-based lab report ingestion, and Clerk-authenticated user profiles.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Features](#4-features)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Environment Variables](#8-environment-variables)
9. [Local Setup & Running](#9-local-setup--running)
10. [ML Model Details](#10-ml-model-details)
11. [RAG Pipeline](#11-rag-pipeline)
12. [OCR & File Upload Pipeline](#12-ocr--file-upload-pipeline)
13. [Authentication Flow](#13-authentication-flow)
14. [Future Scope](#14-future-scope)

---

## 1. Project Overview

ThyroRAG addresses a critical gap in accessible thyroid disease screening. It provides:

- **Instant AI diagnosis** from 28+ clinical and lab parameters via a CatBoost classifier trained on 3,772 real patient cases (98.70% accuracy).
- **Intelligent medical chatbot** powered by Groq LLaMA-3.3-70B with dual-source RAG — answers from both a curated medical knowledge base (ChromaDB) and the user's own uploaded lab reports (Qdrant).
- **OCR-driven form auto-fill** — upload a thyroid lab report image or PDF and the system extracts hormone levels (TSH, T3, TT4, T4U, FTI, TBG), demographics, and medical flags directly into the prediction form.
- **Downloadable PDF reports** with prediction results, probability charts, and patient details.
- **Full auth + history** — every prediction is saved to Supabase, accessible via the Patient History tab.

---

## 2. Tech Stack

### Backend
| Component | Technology |
|---|---|
| API Framework | FastAPI (Python) |
| ML Model | CatBoost Classifier |
| LLM | Groq `llama-3.3-70b-versatile` |
| Knowledge Base Vector DB | ChromaDB |
| User Documents Vector DB | Qdrant (Docker) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace) |
| OCR / Document Parsing | Apache Tika 3.2.3 (Docker, Tesseract backend) |
| Database | Supabase (PostgreSQL) |
| Auth Verification | Clerk JWT (PyJWT + cryptography) |
| File I/O | python-multipart, aiofiles |
| Data Processing | pandas, numpy, scikit-learn, joblib |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 18 |
| Authentication | Clerk (`@clerk/react`) |
| Database Client | Supabase JS (`@supabase/supabase-js`) |
| Icons | lucide-react, boxicons |
| PDF Generation | jsPDF + jspdf-autotable |
| HTTP Client | Axios (via `services/api.js`) |
| Styling | Custom CSS (olive green theme) |

### Infrastructure
| Service | Purpose |
|---|---|
| Docker | Runs Qdrant (port 6333) and Apache Tika (port 9998) |
| Supabase | PostgreSQL database + Row Level Security |
| Clerk | User authentication, JWT token issuance |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Frontend (port 3000)                   │
│                                                                     │
│  ┌──────────┐  ┌───────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ Sidebar  │  │Prediction │  │   Chatbot     │  │  Patient    │  │
│  │  (nav)   │  │   Form    │  │  (RAG chat)   │  │  History    │  │
│  └──────────┘  └─────┬─────┘  └───────┬───────┘  └──────┬──────┘  │
│                      │                │                  │         │
│              ┌───────┴────────────────┴──────────────────┘         │
│              │              services/api.js (Axios + Clerk JWT)     │
└──────────────┼─────────────────────────────────────────────────────┘
               │ HTTP (port 8000)
┌──────────────▼─────────────────────────────────────────────────────┐
│                      FastAPI Backend (port 8000)                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Auth Middleware  ←  Clerk JWKS verification                 │  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                     │
│  ┌──────────┐  ┌──────────┐  ┌┴─────────┐  ┌────────────────────┐ │
│  │ POST     │  │ POST     │  │ POST     │  │ GET                │ │
│  │/predict  │  │/chat     │  │/upload/  │  │/predictions/history│ │
│  │          │  │          │  │parse-file│  │                    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬───────────┘ │
│       │             │             │                  │             │
└───────┼─────────────┼─────────────┼──────────────────┼─────────────┘
        │             │             │                  │
        ▼             │             ▼                  ▼
  ┌──────────┐        │      ┌─────────────┐    ┌──────────────┐
  │ CatBoost │        │      │ Apache Tika │    │  Supabase    │
  │  Model   │        │      │ OCR (Docker)│    │  PostgreSQL  │
  │ (.pkl)   │        │      │  port 9998  │    │  (profiles,  │
  └──────┬───┘        │      └──────┬──────┘    │  predictions,│
         │            │             │           │  queries,    │
         │            │             │           │  reports)    │
         ▼            │      ┌──────▼──────┐    └──────────────┘
   Supabase save       │      │ Groq LLM   │
                       │      │ Field      │
                       │      │ Extraction │
                       │      └──────┬──────┘
                       │             │
                       ▼             ▼
              ┌────────────────────────────────────┐
              │          RAG Layer                 │
              │                                    │
              │  ┌─────────────────────────────┐  │
              │  │  ChromaDB (Knowledge Base)   │  │
              │  │  3,777+ medical documents    │  │
              │  │  sentence-transformers embeds│  │
              │  └─────────────────────────────┘  │
              │                                    │
              │  ┌─────────────────────────────┐  │
              │  │  Qdrant (User Documents)     │  │
              │  │  Uploaded lab reports/PDFs   │  │
              │  │  Docker port 6333            │  │
              │  └─────────────────────────────┘  │
              │                                    │
              │  Groq llama-3.3-70b-versatile LLM  │
              │  Priority: uploaded doc > knowledge│
              └────────────────────────────────────┘
```

### Data Flow — Prediction
1. User fills the prediction form (or uploads a lab report → OCR auto-fills it)
2. Frontend sends `POST /predict` with 28+ features + Clerk JWT
3. Backend verifies JWT, runs CatBoost inference, saves result to Supabase `predictions` table
4. Response includes: `prediction`, `confidence`, `prob_negative`, `prob_hypothyroid`, `prob_hyperthyroid`
5. Frontend renders color-coded result + probability bars; PDF download available

### Data Flow — Chat
1. User sends message to `POST /chat` with Clerk JWT
2. Backend searches Qdrant (user-uploaded docs, score threshold ≥ 0.30, top-8)
3. Backend searches ChromaDB (medical knowledge base, top-4)
4. Both contexts merged; LLM instructed to prioritize uploaded doc for patient-specific questions
5. Response saved to Supabase `queries` table; streamed back to frontend

### Data Flow — File Upload
1. User uploads image/PDF/CSV/JSON via PredictionForm or Chatbot
2. `POST /upload/parse-file` — Tika extracts raw text via OCR
3. Groq LLM parses text → JSON of form fields (name, age, TSH, T3, TT4, etc.)
4. Fields returned to frontend for form auto-fill
5. Document chunks also indexed into Qdrant for subsequent chat queries

---

## 4. Features

### Thyroid Disease Prediction
- 28+ input parameters: hormone levels (TSH, T3, TT4, T4U, FTI, TBG), demographics, and 14 medical history boolean flags
- CatBoost classifier with L2 regularization — **98.70% accuracy** on test set
- Missing lab values automatically imputed with dataset medians
- Three-class output: **Hyperthyroid**, **Hypothyroid**, **Negative**
- Probability bars for each class and overall confidence score
- One-click **PDF report download** (jsPDF + autotable) with patient info and results

### RAG Medical Chatbot
- Dual-source RAG: ChromaDB (3,777+ curated medical documents) + Qdrant (user uploads)
- Smart context merging: uploaded patient report is prioritized for patient-specific questions; knowledge base used for general thyroid queries
- Groq `llama-3.3-70b-versatile` LLM, temperature 0.2 for factual medical responses
- Guest mode: 3 free queries before sign-in prompt
- All chat history saved to Supabase `queries` table

### OCR Lab Report Ingestion
- Supports JPEG, PNG, PDF, CSV, JSON
- Apache Tika 3.2.3 with Tesseract OCR backend for image/PDF extraction
- Groq LLM post-processes OCR text to extract structured fields
- Smart decimal recovery: handles OCR artifacts (e.g. `582` → `5.82` using reference ranges)
- Case-normalized hormone keys: Groq may return `tsh` but form needs `TSH` — handled transparently
- Graceful fallback: if OCR yields no text, document is indexed in Qdrant anyway with `status: "partial"`
- Auto-fills form fields: `fullName`, `dob`, `age`, `sex`, `weight`, `TSH`, `T3`, `TT4`, `T4U`, `FTI`, `TBG`, and all 10 medical flag booleans

### Authentication & User Management
- Clerk handles all auth (sign-up, sign-in, session management, JWT)
- Clerk JWT verified on every protected backend endpoint using JWKS
- Supabase `profiles` table upserted on every login (full_name, email, timestamps)
- Row Level Security (RLS) ensures users can only access their own data

### Patient History
- All predictions stored in Supabase with full parameter snapshot
- Filterable/searchable history table with expandable records
- Color-coded diagnosis badges (Hyperthyroid / Hypothyroid / Negative)

### UI / UX
- Collapsible sidebar with 4 tabs: Diagnosis, Chatbot, History, Settings
- Olive green design system with responsive layout (mobile/tablet/desktop)
- Fixed top-right toast notifications with 5-second auto-dismiss
- Mobile hamburger menu
- User avatar with deterministic color generation from name

### Profile & Settings
- Profile tab: edit name, gender, age, phone
- Settings tab: theme/preferences
- ProfileSettings synced to Supabase `profiles`

---

## 5. Project Structure

```
ThyroRAG/
│
├── backend/
│   ├── main.py                      # FastAPI app — prediction, chat, upload endpoints
│   ├── database.py                  # DB utilities
│   ├── supabase_client.py           # Supabase client initialization
│   ├── supabase_setup.sql           # Full Supabase schema (tables, RLS, triggers)
│   ├── requirements.txt             # Python dependencies
│   │
│   ├── auth/
│   │   ├── auth_middleware.py       # Clerk JWT verification middleware
│   │   └── auth_routes.py           # Auth-related routes
│   │
│   ├── RAG/
│   │   ├── rag_engine.py            # ChromaDB RAG engine + Groq LLM chat
│   │   ├── create_vector_db.py      # Seeds ChromaDB with medical knowledge base
│   │   ├── sync_user_data.py        # Supabase → RAG context sync
│   │   └── chroma_db/               # Persisted ChromaDB vector store
│   │
│   ├── routes/
│   │   └── rag_routes.py            # Qdrant upload/search routes
│   │
│   └── vector_db/
│       ├── document_ingestion.py    # Qdrant document chunking + indexing
│       ├── embedding_service.py     # Embedding wrapper
│       ├── vector_search.py         # Qdrant similarity search
│       ├── tika_service.py          # Apache Tika OCR client
│       └── qdrant_client.py         # Qdrant connection
│
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── App.js                   # Root component, Clerk auth, routing
│       ├── index.js
│       │
│       ├── components/
│       │   ├── LandingPage.js       # Public landing page
│       │   ├── Sidebar.js           # Collapsible navigation sidebar
│       │   ├── PredictionForm.js    # Thyroid prediction form + file upload
│       │   ├── Chatbot.js           # RAG chatbot interface
│       │   ├── MessageBubble.js     # Chat message component (Bot/User icons)
│       │   ├── PatientHistory.js    # Prediction history viewer
│       │   ├── ProfileSettings.js   # Profile edit form
│       │   ├── Settings.js          # App settings
│       │   ├── Login.js             # Clerk sign-in wrapper
│       │   └── ProtectedRoute.js    # Route guard
│       │
│       ├── context/
│       │   └── AuthContext.js       # Auth context provider
│       │
│       ├── services/
│       │   └── api.js               # Axios client with Clerk JWT injection
│       │
│       ├── supabase/
│       │   └── supabaseClient.js    # Supabase JS client
│       │
│       ├── utils/
│       │   └── generatePDF.js       # jsPDF report generator
│       │
│       └── styles/                  # Per-component CSS files
│
├── thyroid-disease-detection.ipynb  # ML training notebook
├── thyroidDF (1).csv                # Training dataset (3,772 cases)
├── docker-compose.yml               # Docker services (Qdrant + Tika)
├── quick_setup.ps1                  # Automated setup script
└── README.md                        # This file
```

---

## 6. Database Schema

All tables live in Supabase (PostgreSQL) with Row Level Security enabled.

### `profiles`
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Clerk user ID |
| full_name | TEXT | User's full name |
| age | INTEGER | Age |
| gender | TEXT | M / F / Other |
| phone | TEXT | Phone number |
| role | TEXT | Patient / Doctor / Admin |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### `predictions`
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK → auth.users) | Owner |
| age, sex, weight | FLOAT/TEXT | Demographics |
| tsh, t3, tt4, t4u, fti, tbg | FLOAT | Hormone levels |
| on_thyroxine, sick, pregnant ... | BOOLEAN | 14 medical flags |
| prediction | TEXT | Hyperthyroid / Hypothyroid / Negative |
| confidence | FLOAT | 0–1 |
| prob_negative, prob_hypothyroid, prob_hyperthyroid | FLOAT | Class probabilities |
| created_at | TIMESTAMPTZ | Auto |

### `queries`
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | Owner |
| question | TEXT | User's chat message |
| answer | TEXT | LLM response |
| created_at | TIMESTAMPTZ | Auto |

### `reports`
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | Owner |
| file_name | TEXT | Original filename |
| file_url | TEXT | Storage URL |
| file_type | TEXT | MIME type |
| file_size | INTEGER | Bytes |
| uploaded_at | TIMESTAMPTZ | Auto |

---

## 7. API Reference

All endpoints except `/health` require `Authorization: Bearer <clerk_jwt>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/predict` | Run thyroid disease prediction |
| POST | `/chat` | Send chat message (RAG response) |
| POST | `/upload/parse-file` | Upload file for OCR + RAG indexing |
| GET | `/predictions/history` | Get user's prediction history |
| GET | `/predictions/{id}` | Get single prediction |
| POST | `/rag/upload-file` | Upload document to Qdrant |
| GET | `/rag/search` | Search Qdrant collection |

### `POST /predict` — Request Body
```json
{
  "age": 35, "sex": "F", "weight": 60,
  "TSH": 5.82, "T3": 1.2, "TT4": 95, "T4U": 0.9, "FTI": 105, "TBG": null,
  "on_thyroxine": "No", "sick": "No", "pregnant": "No",
  "thyroid_surgery": "No", "goitre": "No", "tumor": "No",
  "lithium": "No", "psych": "No"
}
```

### `POST /predict` — Response
```json
{
  "prediction": "Hypothyroid",
  "confidence": 0.91,
  "prob_negative": 0.05,
  "prob_hypothyroid": 0.91,
  "prob_hyperthyroid": 0.04
}
```

### `POST /chat` — Request Body
```json
{ "message": "What does a high TSH level mean?" }
```

### `POST /upload/parse-file` — Response
```json
{
  "status": "ok",
  "message": "Extracted and indexed successfully",
  "fields": {
    "fullName": "V MONVITHA SAI", "age": 19, "sex": "F",
    "TSH": 5.82
  }
}
```

---

## 8. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Groq LLM
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxxx...
SUPABASE_SERVICE_KEY=eyJxxxxxx...

# Clerk (for JWT verification)
CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx

# Qdrant (if not using Docker default)
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Tika OCR
TIKA_SERVER_URL=http://localhost:9998
```

Create a `.env` file in the `frontend/` directory:

```env
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxxxxx...
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
REACT_APP_API_URL=http://localhost:8000
```

---

## 9. Local Setup & Running

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker Desktop (for Qdrant + Tika)

### Step 1 — Start Docker services
```bash
docker-compose up -d
```
This starts:
- **Qdrant** on `localhost:6333`
- **Apache Tika** on `localhost:9998`

### Step 2 — Backend setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

# Create the ChromaDB knowledge base (run once)
python RAG/create_vector_db.py

# Start the API server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3 — Frontend setup
```bash
cd frontend
npm install
npm start
```

### Step 4 — Supabase schema
1. Go to Supabase Dashboard → SQL Editor → New Query
2. Paste the contents of `backend/supabase_setup.sql`
3. Click **Run** and confirm

The app will be available at `http://localhost:3000`.

---

## 10. ML Model Details

### Dataset
- **Source**: UCI Thyroid Disease dataset
- **Size**: 3,772 patient records
- **Features**: 28 clinical + lab parameters
- **Classes**: Negative (majority), Hypothyroid, Hyperthyroid

### Model
- **Algorithm**: CatBoost Classifier
- **Regularization**: L2
- **Accuracy**: 98.70% on held-out test set
- **Preprocessing**: StandardScaler for continuous features; boolean/categorical encoding
- **Missing value imputation**: TSH → 1.3, T3 → 1.7, TT4 → 105.0, T4U → 0.95, FTI → 110.0 (dataset medians)

### Training
See `thyroid-disease-detection.ipynb` for the full training pipeline, feature importance analysis, and confusion matrix.

---

## 11. RAG Pipeline

### Dual-Source Architecture
ThyroRAG uses two completely separate vector stores to serve different purposes:

| Store | Purpose | Content |
|---|---|---|
| **ChromaDB** | Medical knowledge base | 3,777+ curated thyroid disease medical documents |
| **Qdrant** | User documents | Patient-uploaded lab reports, PDFs, clinical notes |

### Query Flow
1. User query hits `POST /chat`
2. Qdrant is searched first (`top_k=8`, `score_threshold=0.30`) — for the user's own uploaded documents
3. ChromaDB is searched (`top_k=4`) — for general medical knowledge
4. Both context blocks are passed to Groq LLaMA-3.3-70B with priority instructions:
   - **Patient-specific questions** (about "my report", specific values) → answer ONLY from uploaded document
   - **General thyroid questions** → use knowledge base, optionally supplement with user data
5. LLM response saved to `queries` table in Supabase

### Embeddings
- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Dimension: 384
- Runs locally (no external API calls for embeddings)

---

## 12. OCR & File Upload Pipeline

```
User uploads file
       │
       ▼
FastAPI /upload/parse-file
       │
       ├── CSV/JSON → parse directly → extract known field names
       │
       └── Image/PDF
              │
              ▼
        Apache Tika (Docker port 9998)
        - MIME detection
        - Tesseract OCR for images
        - PDF text extraction
              │
              ▼
        Raw text extracted?
              │
       YES ───┤    NO
              │     └──► Retry with octet-stream MIME
              │                   │
              │            Still empty?
              │                   │
              │             YES ──┤
              │                   └──► Graceful partial fallback
              │                        (index filename in Qdrant, return status: "partial")
              ▼
        Groq LLM field extraction
        (llama-3.3-70b-versatile)
        - Parses unstructured OCR text
        - Returns structured JSON
        - Decimal recovery: "582" + ref range "0.54-5.30" → "5.82"
        - Hormone key normalization: "tsh" → "TSH"
              │
              ▼
        ┌─────────────────────────────────────┐
        │ Document chunks indexed into Qdrant  │
        │ (for future chatbot queries)         │
        └─────────────────────────────────────┘
              │
              ▼
        Return { status, fields } to frontend
        Frontend auto-fills PredictionForm
```

**Supported file types**: JPEG, PNG, PDF, CSV, JSON

---

## 13. Authentication Flow

```
User signs in via Clerk
       │
       ▼
Clerk issues JWT token
       │
       ▼
Frontend (api.js) injects token into every request:
  Authorization: Bearer <clerk_jwt>
       │
       ▼
FastAPI auth_middleware.py:
  1. Extract JWT from header
  2. Fetch Clerk JWKS public keys
  3. Verify signature + expiry
  4. Extract user_id (sub claim)
  5. Attach user to request
       │
       ▼
Endpoint handler receives authenticated user
       │
       ▼
Supabase queries scoped to user_id
(RLS policies enforce: auth.uid()::text = user_id::text)
```

---

## 14. Future Scope

### Short-Term
- **Multi-language OCR**: Support Tamil, Telugu, Hindi lab reports via Tika language packs
- **Report history**: Store and retrieve uploaded lab documents per user from Supabase Storage
- **Chat history persistence**: Load previous chat sessions from `queries` table on page load
- **Email notifications**: Alert patients when abnormal thyroid values are detected

### Medium-Term
- **Doctor dashboard**: Admin/Doctor role can view all patient predictions (currently blocked by RLS)
- **Trend analysis**: Plot TSH, T3, T4 values over time from repeated predictions
- **Differential diagnosis**: Expand model to detect Hashimoto's, Graves' disease, thyroid nodules
- **DICOM support**: Accept radiology reports and ultrasound findings via Tika DICOM parser
- **Streaming chat responses**: Replace full-response API call with SSE/WebSocket streaming

### Long-Term
- **Mobile app**: React Native app with camera-based lab report scanning
- **EHR integration**: HL7 FHIR API for direct import from hospital systems
- **Federated learning**: Improve model accuracy without sharing patient data across institutions
- **Clinical decision support**: Generate structured clinical summaries for physicians
- **Multi-modal RAG**: Index ultrasound images and pathology slides alongside text reports
