from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
import joblib
import pandas as pd
import numpy as np
import os
import bcrypt
from RAG.rag_engine import rag_engine
from database import get_db, User, Prediction, ChatSession, ChatMessage, UserSettings

# Password hashing functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

# 1. Initialize FastAPI app
app = FastAPI(
    title="Thyroid Disease Prediction API",
    description="A minimal API serving a CatBoost model for thyroid screening.",
    version="1.0.0"
)

# 2. Configure CORS (To allow your React frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Define the request schema (Matches features from thyroidDF.csv)
class ThyroidFeatures(BaseModel):
    age: float = Field(..., example=45.0)
    sex: str = Field(..., example="F")  # Expects 'F' or 'M'
    weight: float = Field(default=70.0, example=70.0)
    on_thyroxine: str = Field(default="f", example="f")
    query_on_thyroxine: str = Field(default="f", example="f")
    on_antithyroid_medication: str = Field(default="f", example="f")
    sick: str = Field(default="f", example="f")
    pregnant: str = Field(default="f", example="f")
    thyroid_surgery: str = Field(default="f", example="f")
    I131_treatment: str = Field(default="f", example="f")
    query_hypothyroid: str = Field(default="f", example="f")
    query_hyperthyroid: str = Field(default="f", example="f")
    lithium: str = Field(default="f", example="f")
    goitre: str = Field(default="f", example="f")
    tumor: str = Field(default="f", example="f")
    hypopituitary: str = Field(default="f", example="f")
    psych: str = Field(default="f", example="f")
    TSH: float = Field(..., example=1.3)
    T3: float = Field(..., example=1.0)
    TT4: float = Field(..., example=104.0)
    T4U: float = Field(..., example=1.1)
    FTI: float = Field(..., example=109.0)
    TBG: float = Field(default=None, example=None)  # Optional thyroglobulin
    referral_source: str = Field(default="other", example="SVI")
    user_id: int = Field(default=None, example=1)  # Optional user ID
    
class ChatRequest(BaseModel):
    message: str = Field(..., example="What is a good diet for hypothyroidism?")
    history: list = Field(default=[], example=[])
    user_id: int = Field(default=None, example=1)  # Optional user ID
    session_id: int = Field(default=None, example=1)  # Optional session ID

# 4. Global variable for the model
model = None

# 5. Load model at startup
@app.on_event("startup")
def load_model():
    global model
    # Look for the model in the root directory first, then in the backend directory
    model_paths = ["../final_model.pkl", "final_model.pkl"]
    
    for path in model_paths:
        if os.path.exists(path):
            try:
                model = joblib.load(path)
                print(f"[OK] Model loaded successfully from {path}")
                return
            except Exception as e:
                print(f"[ERROR] Error loading model from {path}: {e}")
    
    print(f"[WARNING] final_model.pkl not found. Please ensure the model file is generated from the notebook.")

@app.get("/")
def health_check():
    return {"status": "online", "model_loaded": model is not None}

# 5. Define the prediction endpoint
@app.post("/predict")
async def predict(data: ThyroidFeatures, db: Session = Depends(get_db)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded on server.")
    
    try:
        # Convert Pydantic object to Dictionary
        input_dict = data.dict()
        user_id = input_dict.pop('user_id', None)
        weight = input_dict.pop('weight', None)
        tbg_value = input_dict.pop('TBG', None)  # Remove TBG as it's not used in the model
        
        # Convert to DataFrame (CatBoost models often expect DataFrame/Array)
        input_df = pd.DataFrame([input_dict])
        
        # 7. Run Prediction
        prediction = model.predict(input_df)[0]
        # Handle cases where prediction might be an array or value
        if isinstance(prediction, (np.ndarray, list)):
            prediction = prediction[0]
            
        probabilities = model.predict_proba(input_df)[0].tolist()
        
        # Map class names if needed (Common labels in thyroid datasets)
        class_mapping = {0: "Negative", 1: "Hypothyroid", 2: "Hyperthyroid"}
        
        label = class_mapping.get(int(prediction) if isinstance(prediction, (int, float, np.integer)) else prediction, str(prediction))
        
        result = {
            "prediction": str(prediction),
            "result_label": label,
            "confidence": max(probabilities),
            "probabilities": {
                "Negative": probabilities[0],
                "Hypothyroid": probabilities[1],
                "Hyperthyroid": probabilities[2]
            }
        }
        
        # Save to database if user_id is provided
        if user_id:
            try:
                prediction_record = Prediction(
                    user_id=user_id,
                    age=data.age,
                    sex=data.sex,
                    weight=weight,
                    TSH=data.TSH,
                    T3=data.T3,
                    TT4=data.TT4,
                    T4U=data.T4U,
                    FTI=data.FTI,
                    TBG=tbg_value,
                    on_thyroxine=(data.on_thyroxine.lower() == 't'),
                    query_on_thyroxine=(data.query_on_thyroxine.lower() == 't'),
                    on_antithyroid_medication=(data.on_antithyroid_medication.lower() == 't'),
                    sick=(data.sick.lower() == 't'),
                    pregnant=(data.pregnant.lower() == 't'),
                    thyroid_surgery=(data.thyroid_surgery.lower() == 't'),
                    I131_treatment=(data.I131_treatment.lower() == 't'),
                    query_hypothyroid=(data.query_hypothyroid.lower() == 't'),
                    query_hyperthyroid=(data.query_hyperthyroid.lower() == 't'),
                    lithium=(data.lithium.lower() == 't'),
                    goitre=(data.goitre.lower() == 't'),
                    tumor=(data.tumor.lower() == 't'),
                    hypopituitary=(data.hypopituitary.lower() == 't'),
                    psych=(data.psych.lower() == 't'),
                    prediction=label,
                    confidence=result["confidence"],
                    prob_negative=probabilities[0],
                    prob_hypothyroid=probabilities[1],
                    prob_hyperthyroid=probabilities[2]
                )
                db.add(prediction_record)
                db.commit()
                db.refresh(prediction_record)
                result["saved_id"] = prediction_record.id
            except Exception as e:
                print(f"Error saving prediction: {e}")
                db.rollback()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    message = request.message
    user_id = request.user_id
    session_id = request.session_id
    
    # Create or get chat session
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            # Create new session if ID provided but not found
            session = ChatSession(
                id=session_id,
                user_id=user_id,
                session_name=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
            )
            db.add(session)
            db.commit()
    elif user_id:
        # Create new session
        session = ChatSession(
            user_id=user_id,
            session_name=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    
    # Save user message
    if user_id and session_id:
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=message
        )
        db.add(user_msg)
        db.commit()
    
    # Use RAG engine to get full AI response
    response = rag_engine.get_response(message)
    
    # Save assistant message
    if user_id and session_id:
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=response
        )
        db.add(assistant_msg)
        db.commit()
    
    return {
        "message": response,
        "status": "success",
        "session_id": session_id
    }

# ===== HISTORY ENDPOINTS =====

@app.get("/predictions/history/{user_id}")
async def get_prediction_history(user_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """Get user's prediction history"""
    try:
        predictions = db.query(Prediction).filter(
            Prediction.user_id == user_id
        ).order_by(Prediction.created_at.desc()).limit(limit).all()
        
        return {
            "predictions": [
                {
                    "id": p.id,
                    "date": p.created_at.isoformat(),
                    "prediction": p.prediction,
                    "confidence": p.confidence,
                    "age": p.age,
                    "sex": p.sex,
                    "TSH": p.TSH,
                    "T3": p.T3,
                    "TT4": p.TT4,
                    "probabilities": {
                        "Negative": p.prob_negative,
                        "Hypothyroid": p.prob_hypothyroid,
                        "Hyperthyroid": p.prob_hyperthyroid
                    }
                }
                for p in predictions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving history: {str(e)}")

@app.get("/chat/history/{user_id}")
async def get_chat_history(user_id: int, db: Session = Depends(get_db)):
    """Get user's chat sessions"""
    try:
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id == user_id
        ).order_by(ChatSession.updated_at.desc()).all()
        
        return {
            "sessions": [
                {
                    "id": s.id,
                    "session_name": s.session_name,
                    "created_at": s.created_at.isoformat(),
                    "message_count": len(s.messages)
                }
                for s in sessions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chat history: {str(e)}")

@app.get("/chat/messages/{session_id}")
async def get_chat_messages(session_id: int, db: Session = Depends(get_db)):
    """Get messages from a specific chat session"""
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()
        
        return {
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat()
                }
                for m in messages
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving messages: {str(e)}")

# ===== USER AUTHENTICATION =====

@app.post("/auth/login")
async def login(username: str, password: str, db: Session = Depends(get_db)):
    """Login endpoint - verify credentials"""
    try:
        user = db.query(User).filter(User.username == username).first()
        
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return {
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "patient_id": user.patient_id,
            "role": user.role
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.post("/auth/register")
async def register(
    username: str, 
    password: str, 
    full_name: str,
    patient_id: str,
    email: str = None,
    db: Session = Depends(get_db)
):
    """Register new user"""
    try:
        # Check if username or patient_id already exists
        existing = db.query(User).filter(
            (User.username == username) | (User.patient_id == patient_id)
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Username or Patient ID already exists")
        
        # Create new user
        hashed_password = hash_password(password)
        new_user = User(
            username=username,
            password_hash=hashed_password,
            full_name=full_name,
            patient_id=patient_id,
            email=email,
            role="Patient"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create default settings
        settings = UserSettings(user_id=new_user.id)
        db.add(settings)
        db.commit()
        
        return {
            "user_id": new_user.id,
            "username": new_user.username,
            "message": "User registered successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Start server: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)
