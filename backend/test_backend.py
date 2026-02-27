
import requests
import json
import sys
import time

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def test_health():
    print_section("1. Testing Health Endpoint")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API is Online: {data['status']}")
            print(f"✅ ML Model Loaded: {data['model_loaded']}")
            return True
        else:
            print(f"❌ Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        print("➡️ Ensure the backend is running!")
        return False

def test_prediction():
    print_section("2. Testing Prediction Endpoint (ML)")
    
    # Sample patient data (from dataset)
    payload = {
        "age": 45.0,
        "sex": "F",
        "on_thyroxine": "f",
        "query_on_thyroxine": "f",
        "on_antithyroid_medication": "f",
        "sick": "f",
        "pregnant": "f",
        "thyroid_surgery": "f",
        "I131_treatment": "f",
        "query_hypothyroid": "f",
        "query_hyperthyroid": "f",
        "lithium": "f",
        "goitre": "f",
        "tumor": "f",
        "hypopituitary": "f",
        "psych": "f",
        "TSH": 1.3,
        "T3": 1.0,
        "TT4": 104.0,
        "T4U": 1.1,
        "FTI": 109.0,
        "referral_source": "SVI"
    }
    
    try:
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/predict", json=payload)
        duration = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Prediction Success ({duration:.2f}s)")
            print(f"➡️ Result: {data['result_label']}")
            print(f"➡️ Confidence: {data['confidence']:.4f}")
            return True
        else:
            print(f"❌ Prediction Failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_rag_chatbot():
    print_section("3. Testing RAG Chatbot Endpoint (AI)")
    
    # Question that requires knowledge from the vector DB
    question = "What are the symptoms of hypothyroidism?"
    payload = {
        "message": question,
        "history": []
    }
    
    try:
        print(f"❓ Question: {question}")
        print("⏳ Waiting for RAG response (this may take a few seconds)...")
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        duration = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            answer = data['message']
            
            print(f"✅ RAG Success ({duration:.2f}s)")
            print(f"➡️ Answer Length: {len(answer)} chars")
            print("-" * 60)
            print(f"🤖 AI Response:\n{answer}")
            print("-" * 60)
            
            # Simple check to see if it's a real answer or an error message
            if "Error generating response" in answer:
                print(f"❌ CRITICAL ERROR IN BACKEND: {answer}")
            elif "I'm sorry" in answer:
                print("⚠️ Note: AI replied with 'I'm sorry'. This might be a valid answer (no info found) or an issue.")

            return True
        else:
            print(f"❌ RAG Failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🏥 ThyroRAG Backend Diagnostic Test")
    
    health = test_health()
    if health:
        test_prediction()
        test_rag_chatbot()
    else:
        print("\n❌ Critical: Backend is offline. Cannot proceed.")
