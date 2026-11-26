-- Phase 2 architectural migration: Explicit Session Number tracking

-- 1. Add session_number to Assessments
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS session_number INT DEFAULT 1;

-- 2. Add session_number to Session Plans
ALTER TABLE public.session_plans 
ADD COLUMN IF NOT EXISTS session_number INT DEFAULT 1;

-- 3. Add session_number to Audio Uploads
ALTER TABLE public.audio_uploads 
ADD COLUMN IF NOT EXISTS session_number INT DEFAULT 1;

-- 4. Automatically resolve duplicates for existing historical data
-- We assign a sequential session_number (1, 2, 3...) to any existing patient entries based on when they were created
WITH RankedAssessments AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at ASC) as new_session_number
    FROM public.assessments
)
UPDATE public.assessments a
SET session_number = r.new_session_number
FROM RankedAssessments r
WHERE a.id = r.id;

WITH RankedSessionPlans AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at ASC) as new_session_number
    FROM public.session_plans
)
UPDATE public.session_plans a
SET session_number = r.new_session_number
FROM RankedSessionPlans r
WHERE a.id = r.id;

WITH RankedAudioUploads AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY uploaded_at ASC) as new_session_number
    FROM public.audio_uploads
)
UPDATE public.audio_uploads a
SET session_number = r.new_session_number
FROM RankedAudioUploads r
WHERE a.id = r.id;

-- 5. Establish Unique constraints to lock data strictly to distinct sessions
-- Now that data is perfectly deduped, we apply the locks
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_patient_session_unique') THEN
      ALTER TABLE public.assessments ADD CONSTRAINT assessments_patient_session_unique UNIQUE (patient_id, session_number);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_plans_patient_session_unique') THEN
      ALTER TABLE public.session_plans ADD CONSTRAINT session_plans_patient_session_unique UNIQUE (patient_id, session_number);
  END IF;
END $$;
