from fastapi import APIRouter, Depends
from backend.schemas import ChatMessage, ChatResponse
from backend.supabase_client import get_supabase
from backend.auth_middleware import get_current_user
from datetime import datetime
from backend.services.ai_service import ai_service

router = APIRouter()

@router.post("", response_model=ChatResponse)
async def chat_with_assistant(msg: ChatMessage, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    # 1. Generate real response using AWS Bedrock
    # Passing patient and session context for a more personalized response
    ai_text = await ai_service.chat_with_assistant(
        msg.message, 
        patient_id=msg.patient_id, 
        session_number=msg.session_number
    )
    
    # 2. Log to Database for History
    timestamp = datetime.now()
    supabase.table("chat_history").insert({
        "user_id": current_user["id"],
        "user_message": msg.message,
        "ai_response": ai_text,
        "timestamp": timestamp.isoformat()
    }).execute()
    
    return {
        "ai_response": ai_text,
        "timestamp": timestamp
    }
