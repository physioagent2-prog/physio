from fastapi import APIRouter, Depends, HTTPException
from backend.services.ai_service import ai_service
from backend.auth_middleware import get_current_user
from backend.schemas import ChatMessage
from backend.supabase_client import get_supabase
from fastapi.responses import StreamingResponse
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/{patient_id}")
async def context_aware_chat(patient_id: str, msg: ChatMessage, current_user: dict = Depends(get_current_user)):
    """
    Upgraded Chatbot with Patient-Aware context.
    Automatically loads all historical snapshots to provide clinical advice.
    """
    try:
        # 1. Get real response using current patient context (isolated to session if provided)
        ai_text = await ai_service.chat_with_patient_context(patient_id, msg.message, session_number=msg.session_number)
        
        # 2. Try to log to history (non-blocking - don't fail if table doesn't exist)
        try:
            supabase = get_supabase()
            supabase.table("chat_history").insert({
                "user_id": current_user["id"],
                "user_message": msg.message,
                "ai_response": ai_text,
                "timestamp": datetime.now().isoformat()
            }).execute()
        except Exception as log_err:
            logger.warning(f"Chat history logging failed (table may not exist): {log_err}")
        
        return {
            "ai_response": ai_text,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stream/{patient_id}")
async def context_aware_chat_stream(patient_id: str, msg: ChatMessage, current_user: dict = Depends(get_current_user)):
    """
    Streaming version of the Clinical Co-pilot Chatbot.
    Provides real-time clinical analysis for Dr. Kajal.
    """
    try:
        # returns an AsyncGenerator from streaming_service
        stream_gen = await ai_service.chat_with_patient_context_stream(
            patient_id, 
            msg.message, 
            session_number=msg.session_number,
            chat_history=msg.chat_history
        )
        
        return StreamingResponse(
            stream_gen,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logger.error(f"Chatbot streaming error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
