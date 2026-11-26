-- Run this in Supabase SQL Editor so records created by Firebase-authenticated users save without foreign key errors
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_created_by_fkey;
ALTER TABLE public.chat_history DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey;
ALTER TABLE public.audio_uploads DROP CONSTRAINT IF EXISTS audio_uploads_uploaded_by_fkey;
ALTER TABLE public.treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_created_by_fkey;
