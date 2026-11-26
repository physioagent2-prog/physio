-- Phase 3 architectural migration: Patient Session Tracking

-- 1. Add session_number to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS session_number INT DEFAULT 1;

-- 2. Initialize patients.session_number with the maximum session_number from their appointments
WITH MaxSessions AS (
    SELECT patient_id, MAX(session_number) as latest_session
    FROM public.appointments
    GROUP BY patient_id
)
UPDATE public.patients p
SET session_number = m.latest_session
FROM MaxSessions m
WHERE p.id = m.patient_id;
