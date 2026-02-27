
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

try:
    print("Testing gemini-1.5-flash...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    res = model.generate_content("Hi")
    print(f"Success: {res.text}")
except Exception as e:
    print(f"Flash Error: {e}")

try:
    print("Testing gemini-pro...")
    model = genai.GenerativeModel('gemini-pro')
    res = model.generate_content("Hi")
    print(f"Success: {res.text}")
except Exception as e:
    print(f"Pro Error: {e}")
