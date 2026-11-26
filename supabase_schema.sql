-- Move Better Physiotherapy Clinic - Supabase Database Schema

-- 1. USERS TABLE (Linked to Auth users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Therapist' CHECK (role IN ('Admin', 'Therapist', 'Receptionist')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PATIENTS TABLE
CREATE TABLE public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT,
  phone TEXT,
  address TEXT,
  occupation TEXT,
  medical_history TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. APPOINTMENTS TABLE
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  session_type TEXT,
  status TEXT DEFAULT 'Confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ASSESSMENTS TABLE
CREATE TABLE public.assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  chief_complaint TEXT,
  pain_score INTEGER,
  symptoms JSONB,
  rom_data JSONB,
  functional_limitations JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TREATMENT PLANS TABLE
CREATE TABLE public.treatment_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  short_term_goals TEXT,
  long_term_goals TEXT,
  frequency TEXT,
  duration TEXT,
  modalities JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. CHAT HISTORY TABLE
CREATE TABLE public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_message TEXT,
  ai_response TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 7. AUDIO UPLOADS TABLE
CREATE TABLE public.audio_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name TEXT,
  file_path TEXT NOT NULL,
  transcription TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_uploads ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

-- 2. PATIENTS POLICIES
CREATE POLICY "Therapists can view their own patients" ON public.patients
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Therapists can insert their own patients" ON public.patients
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can view all patients" ON public.patients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

-- (Repeat similar policies for other clinical tables)
-- For brevity, I've outlined the most critical ones. 
-- In production, add policies for Appointments, Assessments, etc. 
-- mirroring the Patient access rules.

-- =========================================
-- STORAGE BUCKET (Run this in Supabase Storage dashboard)
-- =========================================
-- Create a bucket named 'physio-audio'
-- Set it to 'Private'
