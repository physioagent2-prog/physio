from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from backend.supabase_client import get_supabase
from backend.auth_middleware import get_current_user
from backend.config import settings
import os
import tempfile
import uuid
import json
from typing import Optional
from backend.services.ai_service import ai_service

router = APIRouter()

@router.post("/upload")
async def upload_audio(
    patient_id: str = Form(...),
    session_number: int = Form(1),
    file: UploadFile = File(...),
    clinical_snapshot: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    
    # 1. Save to temporary file for local Processing
    content = await file.read()
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"audio_{uuid.uuid4().hex}.tmp")
    
    with open(temp_path, "wb") as f:
        f.write(content)
    
    try:
        # 2. RUN AI: Transcribe and Summarize
        print(f"--- Task: Transcribing {file.filename} ---")
        transcript = await ai_service.transcribe_audio(temp_path)
        
        print("--- Task: Generating Clinical Summary ---")
        summary = await ai_service.generate_clinical_summary(transcript)
        
        # 3. Clean up temp file
        os.remove(temp_path)
        
        # 4. Upload original file to Supabase Storage
        ext = file.filename.split(".")[-1]
        filepath = f"uploads/patient_{patient_id}_{uuid.uuid4().hex[:8]}.{ext}"
        
        supabase.storage.from_(settings.AUDIO_BUCKET).upload(
            path=filepath,
            file=content,
            file_options={"content-type": file.content_type}
        )
        
        # 5. Save metadata + AI results to DB
        final_text = f"SUMMARY:\n{summary}\n\nFULL TRANSCRIPT:\n{transcript}"
        
        insert_payload = {
            "patient_id": patient_id,
            "session_number": session_number,
            "file_name": file.filename,
            "file_path": filepath,
            "transcription": final_text,
            "uploaded_by": current_user["id"]
        }
        
        if clinical_snapshot:
            try:
                snapshot_obj = json.loads(clinical_snapshot)
                # Enrich the Audio Metadata section if it exists
                if "Audio Metadata" in snapshot_obj:
                    snapshot_obj["Audio Metadata"]["File Name"] = file.filename
                    snapshot_obj["Audio Metadata"]["File Path"] = filepath
                    # Optionally sync the latest transcript too
                    snapshot_obj["Audio Metadata"]["Transcript"] = final_text
                
                insert_payload["clinical_snapshot"] = snapshot_obj
            except Exception as e:
                print(f"[ERROR] Failed to parse/enrich clinical_snapshot: {str(e)}")

        db_resp = supabase.table("audio_uploads").insert(insert_payload).execute()

        # 6. Generate Signed URL
        signed_url_resp = supabase.storage.from_(settings.AUDIO_BUCKET).create_signed_url(
            path=filepath, 
            expires_in=3600
        )

        return {
            "message": "Upload & AI Processing successful",
            "transcription": final_text,
            "file_url": signed_url_resp["signedURL"],
            "id": db_resp.data[0]["id"]
        }
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@router.get("/url/{upload_id}")
async def get_signed_url(upload_id: str, current_user: dict = Depends(get_current_user)):
    """
    Renew a signed URL for a specific audio upload.
    """
    supabase = get_supabase()
    
    # Fetch file path from DB
    meta = supabase.table("audio_uploads").select("file_path").eq("id", upload_id).single().execute()
    if not meta.data:
        raise HTTPException(status_code=404, detail="Upload not found")
        
    # Generate new signed URL
    signed_url_resp = supabase.storage.from_(settings.AUDIO_BUCKET).create_signed_url(
        path=meta.data["file_path"], 
        expires_in=3600
    )
    
    return {"signed_url": signed_url_resp["signedURL"]}
