-- Unified Clinical Snapshot Migration Script
-- Run this in your Supabase SQL Editor

-- 1. Add column to Patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS clinical_snapshot JSONB;

-- 2. Add column to Appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS clinical_snapshot JSONB;

-- 3. Add column to Assessments
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS clinical_snapshot JSONB;

-- 4. Add column to Audio Uploads
ALTER TABLE public.audio_uploads 
ADD COLUMN IF NOT EXISTS clinical_snapshot JSONB;

-- 5. Optional: Maintenance - Drop the old typo-named column if it exists
-- WARNING: Only run this if you have successfully migrated all data to audio_uploads
-- ALTER TABLE public.assessments DROP COLUMN IF EXISTS audio_trnascript;

COMMENT ON COLUMN public.patients.clinical_snapshot IS 'JSON mirror of all patient data at time of registration/update';
COMMENT ON COLUMN public.appointments.clinical_snapshot IS 'JSON mirror of booking details at time of save';
COMMENT ON COLUMN public.assessments.clinical_snapshot IS 'Unified clinical snapshot of the entire assessment suite';
COMMENT ON COLUMN public.audio_uploads.clinical_snapshot IS 'Metadata snapshot including transcription and AI summaries';
