from fastapi import APIRouter, Depends, HTTPException, Request
from backend.schemas import AppointmentCreate, AppointmentResponse, AppointmentUpdate
from backend.supabase_client import get_supabase
from backend.auth_middleware import get_current_user
from backend.services.notifications import whatsapp
from typing import List

router = APIRouter()

@router.get("/ping")
async def ping_appointments():
    return {"message": "appointments router alive"}

# =============================================
# POST — Book or create an appointment
# Supports both Confirmed (with date/time) and Pending (without)
# =============================================
@router.post("")
async def book_appointment(request: Request, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    data = await request.json()
    
    print(f"[BOOK DEBUG] Incoming data: {data}")
    
    patient_id = data.get("patient_id")
    appt_date = data.get("date")
    appt_time = data.get("time")
    session_type = data.get("session_type", "Initial Assessment")
    session_number = data.get("session_number", 1)
    status = data.get("status", "Pending")
    notes = data.get("notes")
    clinical_snapshot = data.get("clinical_snapshot")
    
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    # If status is Confirmed, date and time are required
    if status == "Confirmed" and (not appt_date or not appt_time):
        raise HTTPException(status_code=400, detail="Date and time required for Confirmed status")
    
    # Time-slot conflict check (only for Confirmed with date+time)
    if status == "Confirmed" and appt_date and appt_time:
        clean_time = str(appt_time)[:5]
        conflict = supabase.table("appointments") \
            .select("id, patients(full_name)") \
            .eq("date", appt_date) \
            .eq("time", clean_time) \
            .neq("status", "Cancelled") \
            .execute()
        
        if conflict.data:
            existing_name = conflict.data[0].get("patients", {}).get("full_name", "another patient")
            raise HTTPException(
                status_code=409, 
                detail=f"Time slot {clean_time} on {appt_date} is already booked by {existing_name}"
            )
    
    # Build insert payload
    insert_data = {
        "patient_id": patient_id,
        "session_type": session_type,
        "session_number": session_number,
        "status": status,
    }
    
    if appt_date:
        insert_data["date"] = str(appt_date).split("T")[0]
    if appt_time:
        insert_data["time"] = str(appt_time)[:5]
    if notes:
        insert_data["notes"] = notes
    if clinical_snapshot:
        insert_data["clinical_snapshot"] = clinical_snapshot
    
    print(f"[BOOK DEBUG] Insert payload: {insert_data}")
    
    resp = supabase.table("appointments").insert(insert_data).execute()
    
    if not resp.data:
        raise HTTPException(status_code=400, detail="Booking failed")
    
    # Notification (placeholder)
    try:
        if status == "Confirmed" and appt_date and appt_time:
            patient = supabase.table("patients").select("phone, full_name").eq("id", patient_id).single().execute()
            if patient.data:
                await whatsapp.send_confirmation(
                    to=patient.data["phone"],
                    data={"name": patient.data["full_name"], "date": appt_date, "time": appt_time}
                )
    except Exception as e:
        print(f"Notification error: {e}")
    
    print(f"[BOOK DEBUG] SUCCESS — created appointment {resp.data[0]['id']}")
    return resp.data[0]


# =============================================
# GET — List all appointments
# =============================================
@router.get("")
async def list_appointments(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    resp = supabase.table("appointments") \
        .select("*, patients(full_name)") \
        .neq("status", "Cancelled") \
        .order("date") \
        .execute()
    return resp.data


# =============================================
# PATCH — Update an appointment (reschedule, change status, etc.)
# =============================================
@router.patch("/{appt_id}")
async def update_appointment(appt_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    raw_body = await request.json()
    print(f"[PATCH DEBUG] appt_id={appt_id}, raw_body={raw_body}")
    
    allowed_fields = {"date", "time", "session_type", "session_number", "notes", "status", "clinical_snapshot"}
    update_data = {}
    
    for key in allowed_fields:
        if key in raw_body and raw_body[key] is not None:
            update_data[key] = raw_body[key]
    
    # Clean date format
    if "date" in update_data:
        update_data["date"] = str(update_data["date"]).split("T")[0]
    
    # Clean time format
    if "time" in update_data:
        update_data["time"] = str(update_data["time"])[:5]
    
    # Time-slot conflict check (if changing to Confirmed with new date+time)
    new_status = update_data.get("status")
    new_date = update_data.get("date")
    new_time = update_data.get("time")
    
    if new_date and new_time and new_status != "Cancelled":
        conflict = supabase.table("appointments") \
            .select("id") \
            .eq("date", new_date) \
            .eq("time", new_time) \
            .neq("status", "Cancelled") \
            .neq("id", appt_id) \
            .execute()
        
        if conflict.data:
            raise HTTPException(
                status_code=409,
                detail=f"Time slot {new_time} on {new_date} is already booked"
            )
    
    print(f"[PATCH DEBUG] clean update_data={update_data}")
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")
    
    resp = supabase.table("appointments").update(update_data).eq("id", appt_id).execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Appointment not found or update failed")
    
    # Re-fetch with patients join
    full = supabase.table("appointments").select("*, patients(full_name)").eq("id", appt_id).single().execute()
    
    print(f"[PATCH DEBUG] SUCCESS — updated appointment {appt_id}")
    return full.data if full.data else resp.data[0]


# =============================================
# DELETE — Soft delete (set status to Cancelled)
# Background task will clean up after 1 hour
# =============================================
@router.delete("/{appt_id}")
async def delete_appointment(appt_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    
    print(f"[DELETE DEBUG] Soft-deleting appointment: {appt_id}")
    
    # Soft delete: set status to Cancelled (background task will clean up)
    resp = supabase.table("appointments") \
        .update({"status": "Cancelled"}) \
        .eq("id", appt_id) \
        .execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    print(f"[DELETE DEBUG] SUCCESS — marked appointment {appt_id} as Cancelled")
    return {"message": "Appointment cancelled. Will be removed in 1 hour.", "id": appt_id}
