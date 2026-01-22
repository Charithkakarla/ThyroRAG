from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np
import os

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
    referral_source: str = Field(default="other", example="SVI")

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
                print(f"✅ Model loaded successfully from {path}")
                return
            except Exception as e:
                print(f"❌ Error loading model from {path}: {e}")
    
    print(f"⚠️ Warning: final_model.pkl not found. Please ensure the model file is generated from the notebook.")

@app.get("/")
def health_check():
    return {"status": "online", "model_loaded": model is not None}

# 6. The Prediction Endpoint
@app.post("/predict")
async def predict(data: ThyroidFeatures):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded on server.")
    
    try:
        # Convert Pydantic object to Dictionary
        input_dict = data.dict()
        
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
        
        return {
            "prediction": str(prediction),
            "result_label": label,
            "confidence": max(probabilities),
            "probabilities": {
                "Negative": probabilities[0],
                "Hypothyroid": probabilities[1],
                "Hyperthyroid": probabilities[2]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Start server: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)
