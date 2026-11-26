-- Session-Based Treatment Planning Migration
-- Run this in your Supabase SQL Editor

-- 1. Ensure appointment_id link exists on treatment_plans
ALTER TABLE public.treatment_plans 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- 2. Add chat_history storage to session consultations
-- We store this as JSONB to preserve the role/content structure
ALTER TABLE public.treatment_plans 
ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb;

-- 3. Add index for faster session fetches
CREATE INDEX IF NOT EXISTS idx_treatment_plans_appointment_id ON public.treatment_plans(appointment_id);

COMMENT ON COLUMN public.treatment_plans.appointment_id IS 'Links the protocol to a specific patient session/appointment';
COMMENT ON COLUMN public.treatment_plans.chat_history IS 'Persistent clinical consultation discussion (Dr. Kajal + AI)';
