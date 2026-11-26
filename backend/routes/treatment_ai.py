from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from backend.services.ai_service import ai_service
from backend.auth_middleware import get_current_user

router = APIRouter()

@router.post("/generate-plan/{patient_id}")
async def generate_streaming_plan(patient_id: str, appointment_id: str = None, session_number: int = None, current_user: dict = Depends(get_current_user)):
    """
    Streaming AI Treatment Plan Generation endpoint.
    Uses patient context to build a personalized rehab protocol.
    """
    try:
        # returns an AsyncGenerator from streaming_service
        stream_gen = await ai_service.generate_streaming_treatment_plan(patient_id, appointment_id=appointment_id, session_number=session_number)
        
        return StreamingResponse(
            stream_gen,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-case/{patient_id}")
async def analyze_case(patient_id: str, appointment_id: str = None, session_number: int = None, current_user: dict = Depends(get_current_user)):
    """
    Streaming AI Case Analysis endpoint.
    Performs a clinical audit to identify gaps before plan generation.
    """
    try:
        stream_gen = await ai_service.analyze_patient_case_stream(patient_id, appointment_id=appointment_id, session_number=session_number)
        
        return StreamingResponse(
            stream_gen,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
