from supabase import create_client, Client
from backend.config import settings

def get_supabase() -> Client:
    """
    Initializes and returns a Supabase client.
    Note: For production environments, consider using the Service Role key 
    ONLY for admin-level operations that bypass RLS. For user operations, 
    the client should use the headers from the incoming request.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
