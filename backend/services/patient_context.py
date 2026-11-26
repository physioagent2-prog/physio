import logging
from backend.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class PatientContextService:
    def __init__(self):
        self.supabase = get_supabase()

    async def get_full_patient_context(self, patient_id: str, session_number: int = None, appointment_id: str = None) -> dict:
        """
        Aggregates clinical snapshots from relevant tables for a specific patient.
        Optionally filters context to a specific session_number or appointment_id.
        """
        context = {
            "patient_profile": {},
            "appointments": [],
            "assessments": [],
            "audio_transcripts": [],
            "previous_plans": []
        }

        try:
            # 1. Fetch Patient Profile (Always included as base context)
            patient_resp = self.supabase.table("patients").select("*").eq("id", patient_id).single().execute()
            if patient_resp.data:
                context["patient_profile"] = patient_resp.data.get("clinical_snapshot") or {
                    "full_name": patient_resp.data.get("full_name"),
                    "dob": patient_resp.data.get("dob"),
                    "gender": patient_resp.data.get("gender"),
                    "medical_history": patient_resp.data.get("medical_history")
                }

            # 2. Fetch Appointments
            appt_query = self.supabase.table("appointments").select("*").eq("patient_id", patient_id)
            if appointment_id:
                appt_query = appt_query.eq("id", appointment_id)
            elif session_number:
                appt_query = appt_query.eq("session_number", session_number)
            
            appt_resp = appt_query.order("created_at", desc=True).execute()
            if appt_resp.data:
                context["appointments"] = [a.get("clinical_snapshot") for a in appt_resp.data if a.get("clinical_snapshot")]

            # 3. Fetch Assessments
            assess_query = self.supabase.table("assessments").select("*").eq("patient_id", patient_id)
            if session_number:
                assess_query = assess_query.eq("session_number", session_number)
            
            assess_resp = assess_query.order("created_at", desc=True).execute()
            if assess_resp.data:
                context["assessments"] = [a.get("clinical_snapshot") for a in assess_resp.data if a.get("clinical_snapshot")]

            # 4. Fetch Audio Uploads (Transcripts)
            audio_query = self.supabase.table("audio_uploads").select("*").eq("patient_id", patient_id)
            if session_number:
                audio_query = audio_query.eq("session_number", session_number)
            
            audio_resp = audio_query.order("uploaded_at", desc=True).execute()
            if audio_resp.data:
                context["audio_transcripts"] = [a.get("clinical_snapshot") for a in audio_resp.data if a.get("clinical_snapshot")]

            # 5. Fetch Session & Treatment Plans
            plans_query = self.supabase.table("treatment_plans").select("*").eq("patient_id", patient_id)
            if session_number:
                plans_query = plans_query.eq("session_number", session_number)
            if appointment_id:
                plans_query = plans_query.eq("appointment_id", appointment_id)
            
            plans_resp = plans_query.order("created_at", desc=True).execute()
            if plans_resp.data:
                context["previous_plans"].extend([p.get("clinical_snapshot") for p in plans_resp.data if p.get("clinical_snapshot")])
            
            return context
        except Exception as e:
            logger.error(f"Error fetching patient context for {patient_id}: {e}")
            return context

patient_context_service = PatientContextService()
