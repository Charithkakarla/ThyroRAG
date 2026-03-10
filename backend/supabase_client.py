import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError(
        "Missing Supabase environment variables. "
        "Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env"
    )

# Service role client — bypasses Row Level Security, for server-side use only
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
