# 🏥 Thyro RAG - Vector Database & RAG Chatbot Setup Guide

## 📋 Complete Setup Instructions

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- 8GB+ RAM recommended
- Gemini API Key (free from Google AI Studio)

---

## 🚀 Step-by-Step Setup

### Step 1: Install Python Dependencies

```bash
# Navigate to project directory
cd ThyroRAG

# Install all required packages
pip install -r requirements.txt
```

**Note:** First installation may take 5-10 minutes to download models.

---

### Step 2: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

---

### Step 3: Configure API Keys

**Option A: Environment Variable (Recommended)**
```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your-api-key-here"

# Windows CMD
set GEMINI_API_KEY=your-api-key-here

# Linux/Mac
export GEMINI_API_KEY="your-api-key-here"
```

**Option B: Edit Python Files Directly**

Edit these files and replace `YOUR_GEMINI_API_KEY_HERE`:
- `backend/create_vector_db.py` (line 33)
- `backend/main.py` (line 23)

```python
GEMINI_API_KEY = "your-actual-api-key-here"
```

---

### Step 4: Create Vector Database

```bashcd backendpython create_vector_db.py
```

**What this does:**
1. Loads thyroid data from CSV
2. Creates 3,772+ medical documents
3. Generates embeddings using local AI model
4. Stores in ChromaDB vector database
5. Saves to `backend/chroma_db/` folder

**Expected output:**
```
====================================================================
🏥 Thyroid Disease RAG - Vector Database Creation
====================================================================
📂 Loading data from thyroidDF (1).csv...
✅ Loaded 3772 rows of data
📝 Creating LangChain Document objects...
✅ Created 3772 Document objects
📚 Adding medical knowledge documents...
✅ Added 5 medical knowledge documents
📊 Total documents to store: 3777
🤖 Initializing embeddings model: sentence-transformers/all-MiniLM-L6-v2
✅ Embeddings model initialized
🗄️ Creating vector database at backend/chroma_db...
✅ Vector database created with 3777 documents
💾 Database saved to: backend/chroma_db
```

**Time:** 10-20 minutes (one-time setup)

---

### Step 5: Start FastAPI Backend

```bash
cd backend
python main.py
```

**Expected output:**
```
====================================================================
🚀 Starting Thyro RAG API
====================================================================
✅ ML Model loaded successfully
📂 Loading vector database from backend/chroma_db...
✅ Vector database loaded successfully
✅ Gemini API initialized
====================================================================
✅ Server ready!
====================================================================
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Backend endpoints available:**
- `GET http://localhost:8000/` - API info
- `POST http://localhost:8000/predict` - Disease prediction
- `POST http://localhost:8000/chat` - RAG chatbot
- `GET http://localhost:8000/health` - Health check

---

### Step 6: Start React Frontend

```bash
cd frontend
npm install
npm start
```

Frontend opens at: **http://localhost:3000**

---

## 🧪 Testing the Vector Database

### Test 1: Similarity Search

```python
from create_vector_db import *

# Initialize
embeddings = initialize_embeddings()
vectordb = load_vector_database(embeddings)

# Search
query = "What are the symptoms of hypothyroidism?"
results = search_similar_documents(vectordb, query, k=3)

for i, doc in enumerate(results, 1):
    print(f"\nResult {i}:")
    print(doc.page_content[:200])
```

### Test 2: RAG Response

```python
# Generate AI response with context
query = "What causes high TSH levels?"
answer = generate_rag_response(vectordb, query, "your-api-key")
print(answer)
```

### Test 3: API Testing with cURL

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test chat endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are symptoms of hypothyroidism?"}'
```

---

## 📁 File Structure

```
ThyroRAG/
├── create_vector_db.py          ✅ Vector DB creation script
├── backend_fastapi.py            ✅ FastAPI server with RAG
├── backend_template.py           ℹ️ Old template (archived)
├── requirements.txt              ✅ Python dependencies
├── thyroidDF (1).csv             ✅ Dataset
├── final_model.pkl               ✅ Trained ML model
├── chroma_db/                    ✅ Vector database (created)
│   ├── chroma.sqlite3
│   └── ... (ChromaDB files)
├── frontend/                     ✅ React app
└── RAG_SETUP_GUIDE.md           📖 This file
```

---

## 🔧 Configuration Options

### Change Embedding Model

Edit in both files:
```python
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Alternatives:
# EMBEDDING_MODEL = "sentence-transformers/all-mpnet-base-v2"  # Better quality, slower
# EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"  # Multilingual
```

### Change Vector Database Location

```python
VECTORDB_PATH = "./chroma_db"  # Change to your preferred path
```

### Change Number of Retrieved Documents

```python
# In backend_fastapi.py, generate_rag_response():
relevant_docs = vectordb.similarity_search(query, k=3)  # Change k value
```

### Adjust Gemini Model

```python
GEMINI_MODEL = "gemini-1.5-flash"  # Fast, efficient

# Alternatives:
# GEMINI_MODEL = "gemini-1.5-pro"  # More accurate, slower
```

---

## 💡 How RAG Works

### Architecture Overview

```
User Question
    ↓
1. Vector Search
   └─→ Query: "What are symptoms of hypothyroidism?"
   └─→ Retrieve 3 most similar documents from vector DB
    ↓
2. Context Building
   └─→ Combine retrieved documents into context
    ↓
3. Prompt Creation
   └─→ System prompt + Context + User question
    ↓
4. Gemini API
   └─→ Generate answer based on context
    ↓
5. Return Response
   └─→ Send to frontend
```

### Example Flow

**User asks:** "What are the symptoms of hypothyroidism?"

**Step 1: Vector Search**
```
Retrieves:
- Document about hypothyroidism symptoms
- Patient cases with hypothyroidism
- Lab findings for hypothyroidism
```

**Step 2: Build Context**
```
Combines all retrieved documents into a single context string
```

**Step 3: Create Prompt**
```
You are a medical AI assistant...

Context: [Retrieved documents about hypothyroidism]

User Question: What are the symptoms of hypothyroidism?

Answer: [Gemini generates response]
```

**Step 4: Response**
```
"Common symptoms of hypothyroidism include fatigue, weight gain, 
cold intolerance, dry skin, hair loss, constipation, depression, 
and slow heart rate. Lab results typically show high TSH levels 
(above 4.0 mIU/L) with low T3 and T4 levels."
```

---

## 🔍 Advanced Features

### Search with Similarity Scores

```python
from create_vector_db import search_with_scores

results = search_with_scores(vectordb, "High TSH meaning", k=3)

for doc, score in results:
    print(f"Score: {score:.3f}")
    print(f"Content: {doc.page_content[:100]}...")
```

### Filter by Metadata

```python
# Search only in hypothyroid cases
results = vectordb.similarity_search(
    "patient symptoms",
    k=3,
    filter={"diagnosis": "Hypothyroid"}
)
```

### Custom Retrieval Chain

```python
from langchain.chains import RetrievalQA
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key="your-key"
)

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectordb.as_retriever(search_kwargs={"k": 3})
)

answer = qa_chain.run("What causes hypothyroidism?")
```

---

## 🐛 Troubleshooting

### Issue 1: "Vector database not found"
**Solution:** Run `python create_vector_db.py` first

### Issue 2: "Gemini API error"
**Solution:** 
- Check API key is correct
- Verify you have API access enabled
- Check quotas at [Google AI Studio](https://makersuite.google.com)

### Issue 3: "Model download timeout"
**Solution:**
- Increase timeout in embeddings initialization
- Check internet connection
- Try a different embedding model

### Issue 4: "Out of memory"
**Solution:**
- Process documents in smaller batches
- Use a smaller embedding model
- Increase system RAM

### Issue 5: "CORS errors in frontend"
**Solution:**
- Verify backend is running on port 8000
- Check CORS configuration in `backend_fastapi.py`
- Update API URL in frontend `api.js`

---

## 📊 Performance Metrics

### Vector Database Stats
- **Documents:** 3,777 (3,772 patient cases + 5 knowledge docs)
- **Embedding dimension:** 384 (MiniLM model)
- **Database size:** ~50-100 MB
- **Query time:** 100-300ms
- **Load time:** 2-5 seconds

### API Performance
- **Prediction endpoint:** ~50-100ms
- **Chat endpoint (RAG):** ~1-3 seconds
  - Vector search: 100-300ms
  - Gemini generation: 1-2 seconds

---

## 🔐 Security Best Practices

### Production Checklist
- [ ] Store API keys in environment variables
- [ ] Use `.env` file with proper .gitignore
- [ ] Enable API rate limiting
- [ ] Add authentication to endpoints
- [ ] Use HTTPS in production
- [ ] Validate all user inputs
- [ ] Implement request size limits
- [ ] Add error logging
- [ ] Monitor API usage
- [ ] Regular security updates

---

## 📈 Scaling Considerations

### For Large Datasets (>10,000 documents)
1. **Batch processing:**
   ```python
   batch_size = 1000
   for i in range(0, len(documents), batch_size):
       batch = documents[i:i+batch_size]
       vectordb.add_documents(batch)
   ```

2. **Use production vector DB:**
   - Pinecone (cloud-hosted)
   - Weaviate (self-hosted)
   - Milvus (high performance)

3. **Optimize embeddings:**
   - Use GPU for faster embedding
   - Cache embeddings
   - Use quantized models

---

## 🎓 Learning Resources

### LangChain
- [LangChain Documentation](https://python.langchain.com/docs/get_started/introduction)
- [Vector Stores Guide](https://python.langchain.com/docs/modules/data_connection/vectorstores/)

### ChromaDB
- [ChromaDB Docs](https://docs.trychroma.com/)
- [Embedding Functions](https://docs.trychroma.com/embeddings)

### Gemini API
- [Gemini API Docs](https://ai.google.dev/docs)
- [API Quickstart](https://ai.google.dev/tutorials/python_quickstart)

### RAG Systems
- [RAG Explained](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Building RAG Applications](https://www.llamaindex.ai/blog/a-cheat-sheet-and-some-recipes-for-building-advanced-rag-803a9d94c41b)

---

## 🤝 Support

### Common Questions

**Q: Do I need GPU?**
A: No, CPU is sufficient. GPU speeds up embeddings but isn't required.

**Q: Is Gemini API free?**
A: Yes, free tier includes 60 requests/minute. See [pricing](https://ai.google.dev/pricing).

**Q: Can I use other LLMs?**
A: Yes! Replace Gemini with OpenAI, Anthropic, or local LLMs (Ollama).

**Q: How do I add more medical knowledge?**
A: Edit `add_medical_knowledge_documents()` in `create_vector_db.py`.

**Q: Can I use this for other diseases?**
A: Yes! Just replace the dataset and knowledge documents.

---

## 📝 Next Steps

1. ✅ Create vector database
2. ✅ Start backend server
3. ✅ Test RAG chatbot
4. ⚡ Optimize for your use case
5. 🚀 Deploy to production

---

**Built with ❤️ for Thyroid Disease Detection & Medical AI**

For issues or questions, create an issue on GitHub.
