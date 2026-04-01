import os
from supabase_client import supabase

print("Testing Supabase insert with CORRECT column names...")
dummy = {
    "user_id": "test_user_123",
    "age": 25.0,
    "sex": "M",
    "tsh": 2.5,
    "t3": 1.8,
    "tt4": 100.0,
    "t4u": 0.9,
    "fti": 105.0,
    "prediction": "Negative",
    "confidence": 0.90,
    "prob_negative": 0.90,
    "prob_hypothyroid": 0.05,
    "prob_hyperthyroid": 0.05,
    "notes": "Test insert",
}

try:
    res = supabase.table("predictions").insert(dummy).execute()
    print("SUCCESS — inserted row:", res.data)
    
    # Clean up test row
    if res.data:
        row_id = res.data[0]['id']
        supabase.table("predictions").delete().eq("id", row_id).execute()
        print("Cleaned up test row.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("FAILED:", e)
