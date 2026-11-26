-- ============================================================
-- RESTRUCTURE TREATMENT TABLES
-- 1. Rename existing treatment_plans to session_plans
-- 2. Create a clean treatment_plans for finalized summaries
-- ============================================================

-- Step 1: Rename the table (Preserves all data and columns we just added)
ALTER TABLE public.treatment_plans RENAME TO session_plans;

-- Step 2: Update the index name for clarity
ALTER INDEX IF EXISTS idx_treatment_plans_patient_id RENAME TO idx_session_plans_patient_id;

-- Step 3: Create the NEW treatment_plans table
CREATE TABLE IF NOT EXISTS public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    finalized_content TEXT,
    clinical_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active'
);

-- Index for the new table
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
