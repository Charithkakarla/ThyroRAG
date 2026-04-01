# ThyroRAG — Presentation Slides Content

---

## SLIDE 1 — Title Slide

```
────────────────────────────────────────────────────────────
                         ThyroRAG
         AI-Powered Thyroid Disease Detection &
               Intelligent Medical Assistant
────────────────────────────────────────────────────────────

Team Members & Roll Numbers:
  ┌──────────────────────────────────┬────────────────┐
  │ Name                             │  Roll Number   │
  ├──────────────────────────────────┼────────────────┤
  │ [Member 1 Name]                  │  [Roll No.]    │
  │ [Member 2 Name]                  │  [Roll No.]    │
  │ [Member 3 Name]                  │  [Roll No.]    │
  │ [Member 4 Name]                  │  [Roll No.]    │
  └──────────────────────────────────┴────────────────┘

Guide Name   : [Guide / Faculty Advisor Name]
Department   : [Department Name]
Class        : [Class / Year / Section]
Institution  : [Institution Name]
Academic Year: 2025–2026
────────────────────────────────────────────────────────────
```

---

## SLIDE 2 — Problem Statement

### Problem Description
Thyroid disorders affect over **200 million people** globally, yet a large proportion go undiagnosed due to:
- Vague, overlapping symptoms (fatigue, weight changes, mood swings)
- Limited access to endocrinologists in rural and semi-urban areas
- High cost and delay of lab report interpretation
- Patients receiving lab reports (TSH, T3, T4 levels) with no context on what the values mean

### Existing Challenges

| Challenge | Impact |
|---|---|
| Manual lab report reading is slow and error-prone | Delayed diagnosis |
| No unified tool for prediction + explanation | Patients visit multiple platforms |
| General chatbots lack patient-specific context | Generic, unhelpful responses |
| OCR extraction of lab values is unreliable | Forms filled incorrectly or manually |
| Authentication + history tracking absent | No longitudinal patient monitoring |

### Motivation
- A patient receiving a TSH value of 5.82 uIU/mL has no easy way to know if this indicates hypothyroidism
- Existing solutions either predict OR answer questions — none combine both with patient's own data
- Lab reports often come as scanned images/PDFs — a system that can read these directly would save significant time
- With ML accuracy of **98.70%**, automated screening can serve as a first-level triage tool before clinical consultation

---

## SLIDE 3 — System Architecture

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    React Frontend  (Port 3000)                   │
│                                                                  │
│   LandingPage  │  PredictionForm  │  Chatbot  │  PatientHistory  │
│                                                                  │
│              Clerk Authentication (JWT tokens)                   │
│              Axios API Service Layer  (api.js)                   │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼──────────────────────────────────────┐
│                   FastAPI Backend  (Port 8000)                   │
│                                                                  │
│   Auth Middleware → Clerk JWKS Verification                      │
│                                                                  │
│  /predict   /chat   /upload/parse-file   /predictions/history    │
│      │          │            │                    │              │
│      ▼          ▼            ▼                    ▼              │
│  CatBoost   RAG Engine    Apache Tika          Supabase          │
│   Model     (Groq LLM)    OCR Parser          Database           │
└──────┬────────┬──────────────┬────────────────────┬─────────────┘
       │        │              │                    │
       ▼        ▼              ▼                    ▼
  .pkl Model  ChromaDB     Qdrant              Supabase PostgreSQL
  (CatBoost)  Knowledge    User Docs           profiles, predictions,
              Base         (Docker 6333)       queries, reports
              (3777 docs)
                       ▲
                Apache Tika (Docker 9998)
                Tesseract OCR Backend
```

### Technologies & Tools

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | Single-page application |
| Auth | Clerk | User authentication & JWT |
| Backend | FastAPI (Python) | REST API server |
| ML | CatBoost | Thyroid disease classification |
| LLM | Groq llama-3.3-70b-versatile | Chatbot responses & OCR parsing |
| Vector DB 1 | ChromaDB | Medical knowledge base |
| Vector DB 2 | Qdrant | User-uploaded document search |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 | Text vectorization |
| OCR | Apache Tika 3.2.3 + Tesseract | Lab report text extraction |
| Database | Supabase (PostgreSQL) | User data, predictions, history |
| PDF Export | jsPDF + jspdf-autotable | Downloadable reports |
| Containers | Docker | Qdrant + Tika services |

---

## SLIDE 4 — Module Description

### Module List & Functionality

#### Module 1: Authentication Module
- **Components**: Clerk (frontend), `auth/auth_middleware.py` (backend)
- **Functionality**: Sign-up, sign-in, JWT token issuance, token verification via JWKS, session management
- **Interaction**: Every API request passes through this module before reaching any endpoint

#### Module 2: Thyroid Disease Prediction Module
- **Components**: `PredictionForm.js`, `POST /predict`, CatBoost model `.pkl`
- **Functionality**: Collects 28+ clinical parameters, runs ML inference, returns diagnosis (Hyperthyroid / Hypothyroid / Negative) with confidence scores and class probabilities
- **Interaction**: Receives form data from frontend → preprocesses → runs model → saves to Supabase → returns prediction

#### Module 3: RAG Chatbot Module
- **Components**: `Chatbot.js`, `POST /chat`, `RAG/rag_engine.py`, ChromaDB, Qdrant, Groq LLM
- **Functionality**: Answers medical questions using dual-source retrieval — uploaded patient documents (Qdrant) take priority; medical knowledge base (ChromaDB) used for general queries
- **Interaction**: Query → search Qdrant → search ChromaDB → merge contexts → call Groq LLM → return answer → save to `queries` table

#### Module 4: OCR & File Ingestion Module
- **Components**: `POST /upload/parse-file`, `vector_db/tika_service.py`, `vector_db/document_ingestion.py`
- **Functionality**: Accepts image/PDF/CSV/JSON lab reports → extracts text via Apache Tika OCR → sends to Groq LLM for structured field extraction → auto-fills prediction form
- **Interaction**: File upload → Tika OCR → Groq extraction → return fields to frontend + index chunks in Qdrant

#### Module 5: Patient History Module
- **Components**: `PatientHistory.js`, `GET /predictions/history`, Supabase `predictions` table
- **Functionality**: Displays all of the user's past prediction records with hormone values, diagnosis, confidence, and date; supports search and filter by diagnosis
- **Interaction**: Authenticated GET request → Supabase query scoped to user_id → rendered as expandable cards

#### Module 6: PDF Report Module
- **Components**: `utils/generatePDF.js`, `PredictionForm.js`
- **Functionality**: Generates downloadable PDF report with patient info, hormone values, diagnosis, and probability table
- **Interaction**: Triggered after prediction result → jsPDF renders formatted report → browser download

#### Module 7: Profile & Settings Module
- **Components**: `ProfileSettings.js`, `Settings.js`, Supabase `profiles` table
- **Functionality**: View and edit personal profile (name, age, gender, phone); settings preferences
- **Interaction**: Supabase upsert on login; manual edits via PUT call to profiles table

### Module Interaction Diagram

```
         ┌──────────────────────────────────────────────────┐
         │               Authentication Module              │
         │         (Guards all other modules)               │
         └──────┬────────────┬──────────────┬───────────────┘
                │            │              │
     ┌──────────▼──┐  ┌──────▼──────┐  ┌───▼──────────────┐
     │ Prediction  │  │   Chatbot   │  │  File Ingestion  │
     │   Module   │  │   Module    │  │    Module        │
     └──────┬──────┘  └──────┬──────┘  └───┬──────────────┘
            │                │              │
            ▼                ▼              ▼
     ┌─────────────────────────────────────────────────────┐
     │              Supabase Database                      │
     │  predictions  │  queries  │  profiles  │  reports   │
     └─────────────────────────────────────────────────────┘
            │                               │
     ┌──────▼──────┐                ┌───────▼───────┐
     │  Patient    │                │  PDF Report   │
     │  History    │                │   Module      │
     │  Module     │                └───────────────┘
     └─────────────┘
```

---

## SLIDE 5 — Workflow / Process Flow

### Overall System Workflow

```
    USER
     │
     ├──── Signs Up / Signs In
     │          │
     │    Clerk Issues JWT Token
     │          │
     │    ┌─────▼─────────────────────────────────────────┐
     │    │         ThyroRAG Dashboard                     │
     │    │   Sidebar: Diagnosis | Chatbot | History       │
     │    └─────┬─────────────────────────────────────────┘
     │          │
     │    ┌─────▼──────────────────────────────────────────┐
     │    │         WORKFLOW A: Disease Prediction          │
     │    │                                                 │
     │    │  Input: Upload lab report (Image/PDF/CSV/JSON)  │
     │    │          ↓                                      │
     │    │  Process: Apache Tika OCR → Groq LLM →         │
     │    │           Auto-fill form fields                 │
     │    │          ↓                                      │
     │    │  OR: Manually fill 28+ form fields              │
     │    │          ↓                                      │
     │    │  Process: FastAPI → CatBoost model inference    │
     │    │          ↓                                      │
     │    │  Output: Diagnosis + Confidence + Probabilities │
     │    │          + Save to Supabase + PDF download      │
     │    └─────────────────────────────────────────────────┘
     │
     │    ┌─────▼──────────────────────────────────────────┐
     │    │         WORKFLOW B: RAG Chatbot                 │
     │    │                                                 │
     │    │  Input: User types medical question             │
     │    │          ↓                                      │
     │    │  Process: Search Qdrant (user docs, score≥0.30) │
     │    │         + Search ChromaDB (knowledge base)       │
     │    │         + Merge contexts with priority rules    │
     │    │         + Groq LLaMA-3.3-70B generates answer   │
     │    │          ↓                                      │
     │    │  Output: Contextual medical answer              │
     │    │          + Saved to queries table               │
     │    └─────────────────────────────────────────────────┘
     │
     │    ┌─────▼──────────────────────────────────────────┐
     │    │         WORKFLOW C: Patient History             │
     │    │                                                 │
     │    │  Input: View history tab                        │
     │    │          ↓                                      │
     │    │  Process: GET /predictions/history →            │
     │    │           Supabase query (RLS scoped)           │
     │    │          ↓                                      │
     │    │  Output: Filterable list of past diagnoses      │
     │    └────────────────────────────────────────────────-┘
```

### OCR Flow (Input → Process → Output)

```
  INPUT                  PROCESS                       OUTPUT
  ─────                  ───────                       ──────

  Lab Report        →   Apache Tika OCR            →  Raw text
  (JPEG/PNG/PDF)        (Tesseract engine)             (unstructured)

  Raw text          →   Groq LLM extraction        →  Structured JSON
                        (field parsing rules,          {TSH: 5.82,
                        decimal recovery,              age: 19,
                        key normalization)             sex: "F", ...}

  Structured JSON   →   Frontend form auto-fill    →  Filled form
                        (setFormData)                  ready for
                                                       prediction

  File content      →   Chunking + Qdrant index    →  Searchable
                        (sentence-transformers)        user document
                                                       for chatbot
```

---

## SLIDE 6 — UML Diagrams

### Use Case Diagram

```
                         ThyroRAG System
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────┐    ── Register / Login                            │
│  │      │   /                                               │
│  │ User │ ──── Upload Lab Report ──→ (OCR + Auto-fill)      │
│  │      │   \                                               │
│  │(Pati-│    ── Fill Prediction Form ──→ Get Diagnosis      │
│  │ent)  │   |                                               │
│  └──────┘    ── Ask Medical Question ──→ Get RAG Answer     │
│               |                                              │
│               ── View Prediction History                     │
│               |                                              │
│               ── Edit Profile                               │
│               |                                              │
│               └── Download PDF Report                       │
│                                                              │
│  ┌───────┐                                                   │
│  │System │── Auto-index uploaded files into Qdrant          │
│  │       │── Save predictions to Supabase                   │
│  └───────┘── Verify Clerk JWT on every request              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Class Diagram

```
┌──────────────────────────┐       ┌──────────────────────────┐
│       User (Clerk)       │       │       Prediction          │
├──────────────────────────┤       ├──────────────────────────┤
│ + id: UUID               │ 1  *  │ + id: UUID               │
│ + email: string          │───────│ + user_id: UUID          │
│ + full_name: string      │       │ + age: float             │
│ + role: string           │       │ + sex: string            │
└──────────────────────────┘       │ + tsh: float             │
          │                        │ + t3: float              │
          │1                       │ + tt4: float             │
          │*                       │ + prediction: string     │
┌─────────▼────────────────┐       │ + confidence: float      │
│       Profile            │       │ + created_at: timestamp  │
├──────────────────────────┤       └──────────────────────────┘
│ + id: UUID               │
│ + full_name: string      │       ┌──────────────────────────┐
│ + age: integer           │       │         Query            │
│ + gender: string         │       ├──────────────────────────┤
│ + phone: string          │       │ + id: UUID               │
│ + updated_at: timestamp  │       │ + user_id: UUID          │
└──────────────────────────┘       │ + question: string       │
                                   │ + answer: string         │
                                   │ + created_at: timestamp  │
┌──────────────────────────┐       └──────────────────────────┘
│     ThyroRAGEngine       │
├──────────────────────────┤       ┌──────────────────────────┐
│ + vectorstore: Chroma    │       │   VectorSearchService    │
│ + embeddings: HFEmbeds   │       ├──────────────────────────┤
│ + api_key: string        │       │ + client: QdrantClient   │
├──────────────────────────┤       │ + collection: string     │
│ + get_response(q, ctx)   │       ├──────────────────────────┤
│ + get_user_context()     │       │ + search(query, k)       │
│ + add_patient_record()   │       │ + upsert(chunks)         │
└──────────────────────────┘       └──────────────────────────┘
```

### Sequence Diagram — Prediction Flow

```
User       Frontend       FastAPI       CatBoost      Supabase
 │              │              │             │             │
 │  Upload file │              │             │             │
 │─────────────►│              │             │             │
 │              │ POST /upload/parse-file     │             │
 │              │─────────────►│             │             │
 │              │         Tika OCR            │             │
 │              │         Groq extract        │             │
 │              │◄─────────────│{fields}      │             │
 │  Form filled │              │             │             │
 │◄─────────────│              │             │             │
 │  Click       │              │             │             │
 │  Predict     │              │             │             │
 │─────────────►│              │             │             │
 │              │ POST /predict + JWT         │             │
 │              │─────────────►│             │             │
 │              │         Verify JWT          │             │
 │              │         Preprocess          │             │
 │              │─────────────────────────►  │             │
 │              │             model.predict() │             │
 │              │◄──────────────── result ───│             │
 │              │              │ INSERT prediction          │
 │              │              │─────────────────────────► │
 │              │◄─────────────│{prediction, confidence}   │
 │  Show result │              │             │             │
 │◄─────────────│              │             │             │
```

### Sequence Diagram — Chat Flow

```
User       Frontend       FastAPI      Qdrant     ChromaDB    Groq LLM
 │              │              │           │           │           │
 │ Type message │              │           │           │           │
 │─────────────►│              │           │           │           │
 │              │ POST /chat + JWT          │           │           │
 │              │─────────────►│           │           │           │
 │              │         search(query,k=8)│           │           │
 │              │─────────────────────────►│           │           │
 │              │◄──────── qdrant_results ─│           │           │
 │              │         search(query,k=4)│           │           │
 │              │──────────────────────────────────────►│           │
 │              │◄──────────── chroma_results ──────────│           │
 │              │         merge contexts + prompt       │           │
 │              │──────────────────────────────────────────────────►│
 │              │◄───────────────────── LLM answer ────────────────│
 │              │ save to queries table                 │           │
 │              │─────────────►│           │           │           │
 │ See response │              │           │           │           │
 │◄─────────────│              │           │           │           │
```

### Activity Diagram — OCR Upload

```
        [Start Upload]
               │
               ▼
      ┌─────────────────┐
      │ Detect file type │
      └────────┬─────────┘
       CSV/JSON│        │Image/PDF
               │        ▼
               │  ┌──────────────┐
               │  │  Tika OCR    │
               │  └──────┬───────┘
               │         │
               │  Empty  │  Text extracted
               │  ◄──────┤
               │  Retry  │  OK
               │  octet- │
               │  stream ▼
               │  ┌──────────────┐
               │  │  Groq LLM   │
               │  │  extraction  │
               │  └──────┬───────┘
               │         │
               ◄─────────┘
               │
        ┌──────▼──────┐
        │ Index chunks │
        │ into Qdrant  │
        └──────┬───────┘
               │
        ┌──────▼──────┐
        │ Return fields│
        │ to frontend  │
        └──────┬───────┘
               │
        [Auto-fill form]
```

---

## SLIDE 7 — Implementation

### Dataset

| Property | Details |
|---|---|
| Source | UCI Machine Learning Repository — Thyroid Disease Dataset |
| Records | 3,772 patient cases |
| Features | 28 (hormone levels, demographics, 14 medical history flags) |
| Target Classes | Negative, Hypothyroid, Hyperthyroid |
| Class Distribution | Majority Negative (~70%), Hypothyroid (~20%), Hyperthyroid (~10%) |
| Missing Values | Handled via median imputation (TSH=1.3, T3=1.7, TT4=105.0, T4U=0.95, FTI=110.0) |

**Key Features:**
- **Hormone levels**: TSH (Thyroid Stimulating Hormone), T3, TT4, T4U, FTI, TBG
- **Demographics**: Age, Sex, Weight
- **Medical flags**: on_thyroxine, on_antithyroid_medication, thyroid_surgery, i131_treatment, sick, pregnant, goitre, tumor, lithium, psych, query_hypothyroid, query_hyperthyroid

**Model Performance:**
```
Algorithm     : CatBoost Classifier (L2 regularization)
Accuracy      : 98.70%
Cross-val     : 5-fold stratified
Preprocessing : StandardScaler for continuous features
```

### Project Execution

**Running the project requires:**
1. Docker Desktop → starts Qdrant (port 6333) and Apache Tika (port 9998)
2. Python venv → FastAPI backend on port 8000
3. Node.js → React frontend on port 3000

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Backend
cd backend
pip install -r requirements.txt
python RAG/create_vector_db.py        # one-time ChromaDB seed
python -m uvicorn main:app --port 8000 --reload

# 3. Frontend
cd frontend
npm install
npm start
```

**Environment setup:**
- `.env` in `backend/` with: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CLERK_SECRET_KEY`
- `.env` in `frontend/` with: `REACT_APP_CLERK_PUBLISHABLE_KEY`, `REACT_APP_SUPABASE_URL`

### User Interface

**Page 1 — Landing Page**
- Public-facing welcome screen
- Feature highlights and call-to-action
- Guest access to chatbot (3 free queries)

**Page 2 — Prediction Form (Diagnosis Tab)**
- Upload lab report → auto-fills all fields
- Manual entry: age, sex, weight, 6 hormone levels, 14 medical history toggles
- Submit → color-coded diagnosis result
- Probability bars + confidence score
- "Download PDF Report" button

**Page 3 — Chatbot (Medical AI Tab)**
- ChatGPT-style interface with Bot/User avatar icons
- Upload file in search bar → indexed silently (no chat clutter)
- Compact upload progress pill
- Chat history scrollable, new messages auto-scroll

**Page 4 — Patient History Tab**
- Card-based layout of all past predictions
- Expandable cards showing full parameter set
- Search bar + filter by diagnosis type
- Color-coded diagnosis badges

**Page 5 — Profile & Settings**
- Edit name, age, gender, phone
- Synced to Supabase profiles table

---

## SLIDE 8 — Conclusion & Next Steps

### Summary
ThyroRAG successfully delivers a unified medical AI platform that:
- Achieves **98.70% accuracy** in thyroid disease classification using CatBoost on 3,772 real patient cases
- Enables **zero-effort form filling** via OCR-based lab report ingestion (JPEG/PNG/PDF → structured data)
- Provides **patient-context-aware chatbot** answers by combining Qdrant (personal uploads) with ChromaDB (knowledge base)
- Maintains **secure, personalized** user experience through Clerk auth + Supabase Row Level Security

---

### Phase 2 — Implementation Plan

| Feature | Priority | Description |
|---|---|---|
| Doctor Dashboard | High | Admin/Doctor role view of all patients, bypass RLS for authorized medical staff |
| Chat History Persistence | High | Load previous chat sessions from `queries` table on page load |
| Report Storage | High | Save uploaded lab reports to Supabase Storage, view per user |
| Trend Analysis Charts | Medium | Plot TSH/T3/T4 over time from repeated predictions |
| Multi-language OCR | Medium | Tamil, Telugu, Hindi lab reports via Tika language packs |
| Email Alerts | Medium | Notify patients when abnormal thyroid values detected |
| Streaming Chat | Medium | Replace full-response API with SSE/WebSocket streaming |
| Differential Diagnosis | High | Expand to detect Hashimoto's, Graves' disease, thyroid nodules |

---

### Research / Original Paper References

1. **UCI Thyroid Disease Dataset** — Garavan Institute, Sydney (1987), contributed to UCI ML Repository
2. **CatBoost** — Prokhorenkova, L. et al. (2018). "CatBoost: unbiased boosting with categorical features." *NeurIPS*
3. **RAG (Retrieval-Augmented Generation)** — Lewis, P. et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS*
4. **sentence-transformers** — Reimers, N. & Gurevych, I. (2019). "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks." *EMNLP*
5. **Apache Tika** — Apache Software Foundation. Document content detection and analysis framework.
6. **Llama 3** — Meta AI (2024). "Meta Llama 3 Technical Report."
7. **Qdrant** — Qdrant Team (2023). "Qdrant: High-Performance Vector Search Engine."

---

### Project Expo Highlights

**Demonstration Flow for Expo:**
1. Show landing page → sign in
2. Upload a thyroid lab report JPEG → show auto-fill of TSH and other values
3. Click Predict → show diagnosis result with confidence and probability bars
4. Download PDF report
5. Switch to Chatbot → ask "What does my TSH of 5.82 mean?"
6. Show the chatbot answering from the uploaded document context
7. Show Patient History tab with saved predictions

**Unique Selling Points for Expo:**
- End-to-end: upload a photo → get diagnosis → get explanation — in under 30 seconds
- Two vector databases working together intelligently
- Works with real Thyrocare lab report images
- Fully authenticated, data is private per user

---

### Future Scope

#### Near-Term (3–6 months)
- **Mobile App** — React Native with camera-based lab report scanning (no manual upload)
- **DICOM Support** — Accept radiology and ultrasound reports via Tika DICOM parser
- **Voice Input** — Speech-to-text for chatbot queries (accessibility)

#### Medium-Term (6–12 months)
- **EHR Integration** — HL7 FHIR API for direct import from hospital information systems
- **Multi-modal RAG** — Index ultrasound images and pathology slides alongside text
- **Telemedicine Bridge** — Generate structured clinical summary for endocrinologist review
- **Insurance API** — Auto-generate insurance pre-auth forms from prediction results

#### Long-Term (12+ months)
- **Federated Learning** — Improve model accuracy across institutions without sharing raw patient data
- **Clinical Trials Matching** — Match patients to active thyroid clinical trials based on profile
- **WHO / ICMR Integration** — Contribute anonymized data to national thyroid disease registries
- **Regulatory Approval pathway** — CDSCO (India) / FDA (US) Class II medical device software certification

---

*Document prepared for Academic Presentation — ThyroRAG Project*
*Department of [Department Name] | [Institution Name] | 2025–2026*
