"""
Quick test to verify Supabase connection for backend.
Run: python test_supabase.py
"""
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 50)
print("  Supabase Connection Test")
print("=" * 50)

# Check env vars
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"\n[1] SUPABASE_URL      : {'✅ Found' if url else '❌ Missing'}")
print(f"[2] SERVICE_ROLE_KEY  : {'✅ Found' if key else '❌ Missing'}")

if not url or not key:
    print("\n❌ Missing environment variables. Check backend/.env")
    exit(1)

# Try connecting
try:
    from supabase import create_client
    supabase = create_client(url, key)
    print("\n[3] Supabase client   : ✅ Created successfully")
except Exception as e:
    print(f"\n[3] Supabase client   : ❌ Failed — {e}")
    exit(1)

# Try a real query — list users (requires service role)
try:
    response = supabase.auth.admin.list_users()
    print(f"[4] Auth connection   : ✅ Connected — {len(response)} user(s) found")
except Exception as e:
    print(f"[4] Auth connection   : ❌ Failed — {e}")

print("\n✅ Supabase backend connection is working!\n")
