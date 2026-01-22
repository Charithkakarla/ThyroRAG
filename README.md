# 🏥 Thyro RAG - Complete AI Medical Assistant

**Thyroid Disease Detection + RAG-Powered Medical Chatbot**

A full-stack AI application combining Machine Learning disease prediction with a Retrieval-Augmented Generation (RAG) chatbot for medical Q&A.

---

## 🎯 Project Overview

### Features

#### 1️⃣ **Thyroid Disease Prediction**
- ML model with **98.70% accuracy**
- CatBoost classifier with L2 regularization
- Predicts: Hyperthyroid, Hypothyroid, or Negative
- Comprehensive input form with 28+ medical features

#### 2️⃣ **RAG Medical Chatbot**
- Vector database with 3,777+ medical documents
- Local embeddings (sentence-transformers)
- Gemini AI-powered responses
- Context-aware answers from medical knowledge base

#### 3️⃣ **Modern UI**
- React frontend with olive green theme
- ChatGPT-style interface
- Responsive design (mobile/tablet/desktop)
- Real-time predictions and chat

---

## 📂 Project Structure

```
ThyroRAG/
├── 🤖 backend/                    # Backend (Python + FastAPI)
│   ├── main.py                    # Main API server
│   ├── create_vector_db.py        # Vector database creation
│   ├── test_setup.py              # System verification
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment config template
│   ├── README.md                  # Backend documentation
│   └── chroma_db/                 # Vector database (created)
│
├── 💻 frontend/                   # Frontend (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── PredictionForm.js  # Disease prediction UI
│   │   │   ├── Chatbot.js         # Chat interface
│   │   │   └── MessageBubble.js   # Chat messages
│   │   ├── services/
│   │   │   └── api.js             # API integration
│   │   └── styles/                # CSS files
│   ├── package.json               # npm dependencies
│   └── README.md                  # Frontend documentation
│
├── 📊 Data & Models
│   ├── thyroidDF (1).csv          # Dataset (3,772 cases)
│   ├── final_model.pkl            # Trained ML model
│   └── thyroid-disease-detection.ipynb  # ML training notebook
│
├── 📖 Documentation
│   ├── README.md                  # This file
│   ├── RAG_SETUP_GUIDE.md         # RAG setup instructions
│   └── quick_setup.ps1            # Automated setup script
```

---

## 🚀 Quick Start (5 Steps)

### Step 1: Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create free API key
3. Set environment variable:

```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your-api-key-here"

# Linux/Mac
export GEMINI_API_KEY="your-api-key-here"
```

### Step 3: Create Vector Database

```bash
cd backend
python create_vector_db.py
```

**Time:** 10-20 minutes (one-time setup)

### Step 4: Start Backend

```bash
cd backend
python main.py
```

Backend runs at: http://localhost:8000

### Step 5: Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend opens at: http://localhost:3000

---

## 🧪 Verify Setup

cd backend
Run the test script to check everything:

```bash
python test_setup.py
```

Expected output:
```
✅ Packages - All imports successful
✅ Data File - Dataset found
✅ Vector Database - Loaded successfully
✅ ML Model - Model loaded
✅ Gemini API - Connection successful
✅ Similarity Search - Working

📊 Passed: 6/6 tests
🎉 All tests passed! System is ready to use.
```

---

## 💡 How It Works

### ML Prediction Pipeline

```
User Input (Age, Hormones, Symptoms)
    ↓
Preprocessing (Feature Engineering)
    ↓
CatBoost Model (98.70% accuracy)
    ↓
Prediction (Hyper/Hypo/Negative) + Confidence
    ↓
Frontend Display
```

### RAG Chatbot Pipeline

```
User Question
    ↓
1. Vector Search (ChromaDB)
   └─→ Retrieve 3 most similar medical documents
    ↓
2. Context Building
   └─→ Combine retrieved docs
    ↓
3. Prompt Engineering
   └─→ System prompt + Context + Question
    ↓
4. Gemini API
   └─→ Generate contextual answer
    ↓
5. Response to User
```

---

## 📊 Tech Stack

### Backend
- **Framework:** FastAPI
- **ML Model:** CatBoost (scikit-learn)
- **Vector DB:** ChromaDB
- **Embeddings:** sentence-transformers (local)
- **LLM:** Google Gemini API
- **Orchestration:** LangChain

### Frontend
- **Framework:** React (functional components)
- **State:** useState, useEffect hooks
- **API:** Axios
- **Styling:** Custom CSS (olive green theme)

### Data Science
- **Dataset:** 3,772 thyroid patient cases
- **Features:** 28 medical attributes
- **Target:** 3 classes (Hyper/Hypo/Negative)
- **Accuracy:** 98.70%

---

## 🎨 Frontend Features

### 1. Disease Prediction Form
- Age, sex, hormone levels (TSH, T3, TT4, T4U, FTI)
- Medical history checkboxes
- Real-time validation
- Color-coded results
- Probability visualizations

### 2. RAG Chatbot
- ChatGPT-style UI
- Auto-scroll to latest message
- Typing indicator
- Suggested questions
- Message timestamps
- Clear chat function

### 3. Design
- Olive green & white theme
- Responsive (mobile-first)
- Smooth animations
- Loading states
- Error handling

---

## 📚 API Documentation

### Endpoints

#### GET `/`
API information and status

#### GET `/health`
Health check endpoint

```json
{
  "status": "healthy",
  "ml_model_loaded": true,
  "vector_db_loaded": true,
  "gemini_configured": true
}
```

#### POST `/predict`
Predict thyroid disease

**Request:**
```json
{
  "age": 45,
  "sex": "F",
  "TSH": 2.5,
  "T3": 1.8,
  "TT4": 110,
  ...
}
```

**Response:**
```json
{
  "prediction": "Negative",
  "confidence": 0.987,
  "probabilities": {
    "Hyperthyroid": 0.003,
    "Hypothyroid": 0.010,
    "Negative": 0.987
  }
}
```

#### POST `/chat`
RAG chatbot for medical Q&A

**Request:**
```json
{
  "message": "What are symptoms of hypothyroidism?",
  "history": []
}
```

**Response:**
```json
{
  "message": "Common symptoms include fatigue...",
  "response": "Common symptoms include fatigue..."
}
```

---

## 🔧 Configuration

### Change Vector Database Location
Edit in `create_vector_db.py` and `backend_fastapi.py`:
```python
VECTORDB_PATH = "./chroma_db"
```

### Change Embedding Model
```python
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# Alternatives:
# "sentence-transformers/all-mpnet-base-v2"  # Better quality
# "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"  # Multilingual
```

### Change Number of Retrieved Documents
In `backend_fastapi.py`:
```python
relevant_docs = vectordb.similarity_search(query, k=3)  # Change k
```

### Change AI Model
```python
GEMINI_MODEL = "gemini-1.5-flash"  # Fast
# GEMINI_MODEL = "gemini-1.5-pro"  # More accurate
```

---

## 📈 Performance

### Vector Database
- **Documents:** 3,777
- **Embedding Dimension:** 384
- **Database Size:** ~50-100 MB
- **Query Time:** 100-300ms

### API Response Times
- **Prediction:** 50-100ms
- **Chat (RAG):** 1-3 seconds
  - Vector search: 100-300ms
  - Gemini API: 1-2 seconds

---

## 🐛 Troubleshooting

### "Vector database not found"
```bash
python create_vector_db.py
```

### "Gemini API error"
- Check API key is set correctly
- Verify quotas at Google AI Studio

### "Model not found"
- Train model from notebook: `thyroid-disease-detection.ipynb`
- Save as `final_model.pkl`

### "CORS errors"
- Backend must run on port 8000
- Frontend on port 3000
- Check `api.js` API_BASE_URL

---

## 📖 Documentation Files

1. **[RAG_SETUP_GUIDE.md](RAG_SETUP_GUIDE.md)** - Complete RAG setup
2. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Frontend setup
3. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Full documentation
4. **[backend_fastapi.py](backend_fastapi.py)** - API code (well-commented)
5. **[create_vector_db.py](create_vector_db.py)** - Vector DB code

---

## 🎓 Learning Resources

- [LangChain Docs](https://python.langchain.com/docs/)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [RAG Explained](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [React Docs](https://react.dev/)

---

## 🔐 Security Notes

⚠️ **This is an educational/demo application**

For production:
- [ ] Add authentication
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Validate all inputs
- [ ] Monitor API usage
- [ ] Regular security updates

---

## 📝 Citation

If you use this project, please cite:

```
@software{thyro_rag,
  title = {Thyro RAG: AI-Powered Thyroid Disease Detection with RAG Chatbot},
  year = {2026},
  url = {https://github.com/yourusername/ThyroRAG}
}
```

---

## 📄 License

This project is for educational purposes. Always consult healthcare professionals for medical advice.

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Open Pull Request

---

## 📞 Support

- **Documentation:** Check README files
- **Issues:** Create GitHub issue
- **Questions:** See documentation files

---

## 🎉 Acknowledgments

- Dataset: Thyroid Disease Dataset
- ML Model: CatBoost
- Embeddings: Sentence Transformers
- LLM: Google Gemini
- Framework: LangChain, FastAPI, React

---

**Built with ❤️ for Medical AI Education**

**Thyro RAG** - Making thyroid disease detection and medical information accessible through AI.

---

## 🚦 Status

- ✅ ML Model: Ready (98.70% accuracy)
- ✅ Vector Database: Ready
- ✅ RAG Chatbot: Ready
- ✅ API Backend: Ready
- ✅ React Frontend: Ready
- ✅ Documentation: Complete

**Version:** 2.0.0  
**Last Updated:** January 2026
