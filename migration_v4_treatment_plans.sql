-- Phase 2 architectural migration: Part 2 (Treatment Plans fix)

-- 1. Add session_number to Treatment Plans
ALTER TABLE public.treatment_plans 
ADD COLUMN IF NOT EXISTS session_number INT DEFAULT 1;

-- 2. Automatically resolve duplicates for existing historical records
WITH RankedTreatmentPlans AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at ASC) as new_session_number
    FROM public.treatment_plans
)
UPDATE public.treatment_plans a
SET session_number = r.new_session_number
FROM RankedTreatmentPlans r
WHERE a.id = r.id;

-- 3. Establish Unique constraint to lock data strictly to distinct sessions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_plans_patient_session_unique') THEN
      ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_patient_session_unique UNIQUE (patient_id, session_number);
  END IF;
END $$;
