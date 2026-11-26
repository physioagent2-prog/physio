from fastapi import APIRouter, HTTPException, Depends, status
from backend.schemas import UserCreate, UserLogin, UserResponse
from backend.supabase_client import get_supabase
from backend.config import settings
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/signup", response_model=UserResponse)
async def signup(user_data: UserCreate):
    supabase = get_supabase()
    
    # 1. Sign up user in Supabase Auth with metadata
    auth_resp = supabase.auth.sign_up({
        "email": user_data.email,
        "password": user_data.password,
        "options": {
            "data": {
                "role": "Admin"
            }
        }
    })
    
    if not auth_resp.user:
        raise HTTPException(status_code=400, detail="Signup failed")
    
    # Note: The 'public.users' insertion is now handled automatically 
    # by the Database Trigger we set up in Supabase.
    user_id = auth_resp.user.id
    
    return {
        "id": user_id,
        "email": user_data.email,
        "role": "Admin",
        "created_at": auth_resp.user.created_at
    }

@router.post("/login")
async def login(user_data: UserLogin):
    supabase = get_supabase()
    try:
        resp = supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })
        
        # Universal access: Default all logins to Admin role
        role = "Admin"
        
        return {
            "access_token": resp.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": resp.user.id,
                "email": resp.user.email,
                "role": role
            }
        }
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
