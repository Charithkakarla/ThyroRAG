import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print('❌ No API key')
else:
    genai.configure(api_key=api_key)
    try:
        models = genai.list_models()
        print('Available models:')
        for m in models:
            print(f"- {m.name} (version: {m.version}, supported: {m.supported_generation_methods})")
    except Exception as e:
        print(f'Error listing models: {e}')
