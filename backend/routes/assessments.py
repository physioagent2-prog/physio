from fastapi import APIRouter, Depends, HTTPException
from backend.supabase_client import get_supabase
from backend.auth_middleware import get_current_user
from typing import List

router = APIRouter()

# ASSESSMENTS
@router.post("/assessments")
async def create_assessment(data: dict, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Map frontend data to existing Supabase schema
    supabase_data = {
        "patient_id": data.get("patient_id"),
        "session_number": int(data.get("session_number", 1)),
        "chief_complaint": data.get("chief_complaint"),
        "pain_score": int(data.get("pain_intensity", 0)),
        "symptoms": {
            "onset": data.get("onset"),
            "pain_types": data.get("pain_types"),
            "associated_symptoms": data.get("associated_symptoms"),
            "posture_observation": data.get("posture_observation"),
            "special_tests": data.get("special_tests")
        },
        "rom_data": data.get("rom"),
        "functional_limitations": data.get("functional_limitations"),
        "clinical_snapshot": data.get("clinical_snapshot") # Standardized Snapshot
    }
    
    insert_data = {k: v for k, v in supabase_data.items() if v is not None}
    
    # Use upsert to handle updates to the same session number gracefully
    resp = supabase.table("assessments").upsert(insert_data, on_conflict="patient_id,session_number").execute()
    if not resp.data:
        raise HTTPException(status_code=400, detail="Failed to save assessment")
        
    return resp.data[0]

@router.get("/assessments/{patient_id}")
async def get_assessment(patient_id: str, session_number: int = None, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    query = supabase.table("assessments").select("*").eq("patient_id", patient_id)
    if session_number:
        query = query.eq("session_number", session_number)
    resp = query.order("created_at", desc=True).limit(1).execute()
    return resp.data[0] if resp.data else None

@router.patch("/assessments/{patient_id}/transcript")
async def update_assessment_transcript(patient_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    transcript = data.get("transcript")
    
    # Target LATEST audio upload for this patient
    resp = supabase.table("audio_uploads").select("id").eq("patient_id", patient_id).order("uploaded_at", desc=True).limit(1).execute()
    
    if not resp.data:
        # Create a new audio history entry if no previous recording exists
        # This will now store the snapshot too
        snapshot = data.get("clinical_snapshot")
        if snapshot and "Audio Metadata" in snapshot:
            snapshot["Audio Metadata"]["File Name"] = "Manual Transcription Note"
            snapshot["Audio Metadata"]["File Path"] = "manual_transcription"
            snapshot["Audio Metadata"]["Transcript"] = transcript
            
        insert_data = {
            "patient_id": patient_id,
            "session_number": int(data.get("session_number", 1)),
            "file_name": "Manual Transcription Note",
            "file_path": "manual_transcription", 
            "transcription": transcript,
            "uploaded_by": current_user["id"],
            "clinical_snapshot": snapshot
        }
        res = supabase.table("audio_uploads").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create transcription record")
        return {"message": "New transcription record created successfully"}
    
    # Update existing record
    upload_id = resp.data[0]["id"]
    
    # Fetch full record to get file_name and file_path for snapshot enrichment
    existing_record = supabase.table("audio_uploads").select("file_name, file_path").eq("id", upload_id).single().execute()
    
    update_data = {"transcription": transcript}
    if data.get("clinical_snapshot"):
        snapshot = data.get("clinical_snapshot")
        # Enrich Audio Metadata if keys are present
        if "Audio Metadata" in snapshot:
            snapshot["Audio Metadata"]["File Name"] = existing_record.data.get("file_name", "Unknown")
            snapshot["Audio Metadata"]["File Path"] = existing_record.data.get("file_path", "N/A")
            snapshot["Audio Metadata"]["Transcript"] = transcript
        update_data["clinical_snapshot"] = snapshot
        
    update_resp = supabase.table("audio_uploads").update(update_data).eq("id", upload_id).execute()
    
    if not update_resp.data:
        raise HTTPException(status_code=400, detail="Failed to update transcription")
        
    return {"message": "Transcription updated in audio history"}

# SESSION PLANS (Formerly Treatment Plans)
@router.post("/session-plans")
async def create_session_plan(data: dict, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    resp = supabase.table("session_plans").insert(data).execute()
    return resp.data[0]

@router.get("/session-plans/{patient_id}")
async def get_session_plan(patient_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    resp = supabase.table("session_plans").select("*").eq("patient_id", patient_id).order("created_at", desc=True).limit(1).execute()
    return resp.data[0] if resp.data else None
