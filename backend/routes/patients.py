from fastapi import APIRouter, Depends, HTTPException
from backend.schemas import PatientCreate, PatientResponse, PatientUpdate
from backend.supabase_client import get_supabase
from backend.auth_middleware import get_current_user
from typing import List

router = APIRouter()

@router.post("", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Add created_by from JWT
    data = patient.dict()
    data["created_by"] = current_user["id"]

    # Convert date objects to strings for Supabase
    if data.get("dob"):
        data["dob"] = data["dob"].isoformat()
    else:
        data["dob"] = None
    data.pop("session_number", None)
    data.pop("session_type", None)
    resp = supabase.table("patients").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=400, detail="Failed to create patient")
        
    return resp.data[0]

@router.get("", response_model=List[PatientResponse])
async def list_patients(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Universal access: No role/ownership filtering
    resp = supabase.table("patients").select("*").execute()
    return resp.data

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    resp = supabase.table("patients").select("*").eq("id", patient_id).single().execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Universal access: No ownership checks
        
    return resp.data

@router.get("/{patient_id}/profile")
async def get_patient_profile(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Returns full patient profile + appointment history for the View Panel."""
    supabase = get_supabase()
    
    # Get patient details
    pat_resp = supabase.table("patients").select("*").eq("id", patient_id).single().execute()
    if not pat_resp.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get appointment history for this patient, ordered newest first
    appts_resp = supabase.table("appointments").select("*") \
        .eq("patient_id", patient_id) \
        .order("date", desc=True) \
        .execute()
    
    return {
        "patient": pat_resp.data,
        "appointments": appts_resp.data or []
    }

@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patch_data: PatientUpdate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Filter out unset values — use field names (dob, phone) NOT aliases (date_of_birth, contact_number)
    # because the database columns are dob and phone
    update_data = {k: v for k, v in patch_data.dict().items() if v is not None}
    
    if "dob" in update_data and update_data["dob"]:
        update_data["dob"] = update_data["dob"].isoformat()
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")
        
    # Universal access: No ownership checks

    resp = supabase.table("patients").update(update_data).eq("id", patient_id).execute()
    
    if not resp.data:
        raise HTTPException(status_code=400, detail="Update failed")
        
    return resp.data[0]

