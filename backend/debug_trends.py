
import os
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.append(str(Path.cwd()))

try:
    from supabase_client import supabase
    print("Fetching TSH trend data...")
    res = supabase.table('predictions').select('tsh, created_at').order('created_at').execute()
    for d in res.data:
        print(f"{d['created_at']}: TSH={d['tsh']}")
except Exception as e:
    print("FAILURE:", e)
