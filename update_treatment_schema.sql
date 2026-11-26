-- ============================================================
-- Treatment Plans Table — Schema Upgrade
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE public.treatment_plans
    ADD COLUMN IF NOT EXISTS short_term_goals TEXT,
    ADD COLUMN IF NOT EXISTS long_term_goals   TEXT,
    ADD COLUMN IF NOT EXISTS frequency         TEXT,
    ADD COLUMN IF NOT EXISTS duration_weeks    TEXT,
    ADD COLUMN IF NOT EXISTS modalities        JSONB,
    ADD COLUMN IF NOT EXISTS therapist_notes   TEXT,
    ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS clinical_snapshot JSONB;

-- Index for faster patient lookups
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
