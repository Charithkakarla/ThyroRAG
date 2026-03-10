# database.py -- Supabase helper
from supabase_client import supabase

PROFILES_TABLE = 'profiles'
PREDICTIONS_TABLE = 'predictions'
REPORTS_TABLE = 'reports'
QUERIES_TABLE = 'queries'

__all__ = ['supabase', 'PROFILES_TABLE', 'PREDICTIONS_TABLE', 'REPORTS_TABLE', 'QUERIES_TABLE']

