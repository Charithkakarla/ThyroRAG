
import os
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.append(str(Path.cwd()))

try:
    from supabase_client import supabase
    print("Testing Supabase insert into 'queries'...")
    res = supabase.table('queries').insert({
        'user_id': 'debug_user_123',
        'question': 'How are you?',
        'answer': 'I am a diagnostic test.'
    }).execute()
    print("SUCCESS:", res.data)
except Exception as e:
    print("FAILURE:", e)
