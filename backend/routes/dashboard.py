from fastapi import APIRouter, Depends
from backend.supabase_client import get_supabase
from backend.auth_middleware import get_current_user
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    today_str = date.today().isoformat()
    
    # Week boundaries (Monday to Sunday)
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    start_of_week_str = start_of_week.isoformat()
    end_of_week_str = end_of_week.isoformat()

    try:
        # =========================================
        # ALL STATS FROM appointments.status
        # =========================================
        
        # Fetch ALL non-cancelled appointments (with patient info)
        all_appts_resp = supabase.table("appointments") \
            .select("*, patients(full_name, phone, created_at)") \
            .neq("status", "Cancelled") \
            .execute()
        
        all_appts = all_appts_resp.data if all_appts_resp.data else []
        
        # 1. Active Patients = unique patients with non-cancelled appointments
        active_patient_ids = set(a["patient_id"] for a in all_appts)
        active_patients_count = len(active_patient_ids)
        
        # 2. Pending Appointments = status == 'Pending'
        pending_appts = [a for a in all_appts if a["status"] == "Pending"]
        pending_count = len(pending_appts)
        
        # 3. Today's Appointments = date == today AND status == 'Confirmed'
        today_appts = [a for a in all_appts 
                       if a.get("date") and str(a["date"])[:10] == today_str 
                       and a["status"] == "Confirmed"]
        today_count = len(today_appts)
        
        # 4. Sessions This Week = date in this week AND status in (Confirmed, Completed)
        week_appts = [a for a in all_appts
                      if a.get("date") 
                      and start_of_week_str <= str(a["date"])[:10] <= end_of_week_str
                      and a["status"] in ("Confirmed", "Completed")]
        sessions_week = len(week_appts)
        
        # 5. Today's Detailed Schedule (for the schedule panel)
        schedule = []
        for a in today_appts:
            schedule.append({
                "time": a.get("time"),
                "status": a.get("status"),
                "session_number": a.get("session_number", 1),
                "patients": a.get("patients")
            })
        schedule.sort(key=lambda x: x.get("time") or "99:99")
        
        # 6. Pending Patients List (for sidebar)
        # Group by patient — show unique patients who have a pending appointment
        seen_patients = set()
        pending_patients_list = []
        for a in pending_appts:
            pid = a["patient_id"]
            if pid not in seen_patients:
                seen_patients.add(pid)
                patient_info = a.get("patients", {})
                pending_patients_list.append({
                    "id": pid,
                    "full_name": patient_info.get("full_name", "Unknown"),
                    "phone": patient_info.get("phone", ""),
                    "created_at": patient_info.get("created_at", ""),
                    "appointment_id": a["id"]  # So frontend can PATCH this appointment
                })

        # 7. Cancelled Appointments List (for Trash Bin)
        cancelled_list = []
        try:
            # Fetch status='Cancelled' (limit to recent ones)
            # We try to use updated_at which was just added to the schema
            cancelled_resp = supabase.table("appointments") \
                .select("id, patient_id, session_number, updated_at, created_at, patients(full_name)") \
                .eq("status", "Cancelled") \
                .order("updated_at", desc=True) \
                .limit(20) \
                .execute()
            
            for c in (cancelled_resp.data or []):
                cancelled_list.append({
                    "id": c["id"],
                    "patient_name": c.get("patients", {}).get("full_name", "Unknown"),
                    "session_number": c.get("session_number", 1),
                    "cancelled_at": c.get("updated_at") or c.get("created_at")
                })
        except Exception as e:
            logger.warning(f"Failed to fetch cancelled_list (likely updated_at missing): {e}")
            # Fallback attempt without updated_at if needed
            try:
                fell_resp = supabase.table("appointments") \
                    .select("id, patient_id, session_number, created_at, patients(full_name)") \
                    .eq("status", "Cancelled") \
                    .order("created_at", desc=True) \
                    .limit(20) \
                    .execute()
                for c in (fell_resp.data or []):
                    cancelled_list.append({
                        "id": c["id"],
                        "patient_name": c.get("patients", {}).get("full_name", "Unknown"),
                        "session_number": c.get("session_number", 1),
                        "cancelled_at": c.get("created_at")
                    })
            except:
                pass

        
        return {
            "active_patients": active_patients_count,
            "today_appointments": today_count,
            "pending_appointments": pending_count,
            "sessions_week": sessions_week,
            "schedule": schedule,
            "pending_patients": pending_patients_list,
            "cancelled_list": cancelled_list
        }

    except Exception as e:
        logger.error(f"Dashboard Stats Error: {e}")
        return {
            "active_patients": 0,
            "today_appointments": 0,
            "pending_appointments": 0,
            "sessions_week": 0,
            "schedule": [],
            "pending_patients": [],
            "error": str(e)
        }
