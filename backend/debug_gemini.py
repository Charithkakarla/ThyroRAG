
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"Key loaded: {api_key[:5]}...")

try:
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0.7
    )
    print("LLM Initialized")
    
    print("Testing invocation...")
    response = llm.invoke("Hello, are you working?")
    print(f"Response: {response.content}")
    
except Exception as e:
    print(f"Error: {e}")
