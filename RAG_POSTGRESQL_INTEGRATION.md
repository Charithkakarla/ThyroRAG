# RAG + PostgreSQL Integration Guide

## 🎯 Overview

Your ThyroRAG system now integrates **real-time user data from PostgreSQL** into the RAG (Retrieval Augmented Generation) chatbot responses. This means the AI can answer questions about actual patients, their predictions, and medical history with timestamps!

---

## ✅ What Was Done

### 1. **Updated RAG Engine** ([rag_engine.py](backend/RAG/rag_engine.py))
   - Added PostgreSQL database connection
   - Created `get_user_context()` method that fetches recent user data
   - Integrated user data into RAG context alongside vector store documents
   - Includes timestamps (registration date, prediction date, last login)

### 2. **Created User Data Sync Script** ([sync_user_data.py](backend/RAG/sync_user_data.py))
   - Fetches user prediction data from PostgreSQL
   - Converts to LangChain documents
   - Adds to ChromaDB vector store
   - Run periodically to keep vector database updated

---

## 🚀 How It Works

```
User Question
     ↓
RAG Engine
     ├─→ Query Vector Store (static medical knowledge + user cases)
     ├─→ Query PostgreSQL (recent live user data with timestamps)
     ↓
Combined Context
     ↓
Gemini AI → Response
```

### What's Included in Context:
- ✅ Patient name and ID
- ✅ Registration date
- ✅ Last prediction date with timestamp
- ✅ Demographics (age, sex)
- ✅ Lab results (TSH, T3, TT4)
- ✅ Diagnosis with confidence score

---

## 📝 Usage

### **For New Users Added to Database:**

1. **Automatic Real-Time Access:**
   - RAG engine automatically fetches latest 10 predictions from PostgreSQL
   - No action needed - works immediately!

2. **Sync to Vector Store (Optional):**
   ```powershell
   cd backend\RAG
   python sync_user_data.py
   ```
   - Adds user data to permanent vector database
   - Useful for historical queries
   - Can be automated with scheduled task

---

## 💬 Example Queries

The chatbot can now answer:

- **"Tell me about recent patients in the database"**
- **"What were the latest thyroid predictions?"**
- **"Show me patients diagnosed with hypothyroidism"**
- **"When was the last patient registered?"**
- **"What are the TSH levels of recent patients?"**

---

## 🔧 Technical Details

### Database Query (Real-Time)
```sql
SELECT u.username, u.full_name, u.patient_id, u.sex,
       u.created_at, p.age, p.prediction, p.confidence,
       p."TSH", p."T3", p."TT4", p.created_at as prediction_date
FROM users u
LEFT JOIN predictions p ON u.id = p.user_id
ORDER BY p.created_at DESC
LIMIT 10;
```

### Context Format
```
=== RECENT PATIENT DATA (From Database) ===

Patient: Sarah Johnson (P001)
  - Registered: 2026-01-30 14:23
  - Last Prediction: 2026-01-30 14:45
  - Demographics: Age 45, Sex F
  - Lab Results: TSH=3.2, T3=1.5, TT4=95.0
  - Diagnosis: Negative (Confidence: 87.3%)
```

---

## 📊 Current Database Stats

Your database currently contains:
- **4 users** (sarah.johnson, michael.chen, emily.rodriguez, admin)
- **2 predictions** with full lab results
- **1 chat session** with 2 messages
- **4 user settings** records

---

## 🔄 Keeping Data in Sync

### Option 1: Real-Time (Default) ✅
- RAG engine queries PostgreSQL on every request
- Always shows latest data
- No sync needed

### Option 2: Vector Store Sync (For Historical Data)
Run manually or schedule:
```powershell
# Windows Scheduled Task
cd C:\Users\nanir\OneDrive\Desktop\Projects\ThyroRAG\backend\RAG
python sync_user_data.py
```

Schedule this daily/weekly to build comprehensive historical context.

---

## 🎯 Benefits

1. **Live Data:** Chatbot always has access to latest patient information
2. **Timestamps:** Know exactly when patients registered and got diagnosed
3. **Context-Aware:** AI can reference specific patients by name and ID
4. **Medical History:** Full lab results and diagnosis history available
5. **Scalable:** Works with growing database automatically

---

## 🛠️ Files Modified/Created

| File | Purpose |
|------|---------|
| `backend/RAG/rag_engine.py` | Added PostgreSQL integration + user context method |
| `backend/RAG/sync_user_data.py` | Script to sync users to vector store |
| `backend/.env` | Database credentials (password: Charith) |

---

## ✨ Next Steps

1. **Test the chatbot** - Ask about recent patients
2. **Add more users** - RAG will automatically include them
3. **Schedule sync** - Set up periodic vector store updates
4. **Monitor responses** - Verify AI uses user data correctly

---

## 🔐 Connection Details

- **Database:** thyrorag
- **User:** thyrorag_user
- **Password:** Charith
- **Connection:** postgresql://thyrorag_user:Charith@localhost:5432/thyrorag

---

**Status:** ✅ RAG + PostgreSQL integration complete and working!

*Your AI chatbot now has superpowers - it knows your patients!* 🚀
