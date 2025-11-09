-- Add logo columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS logo_light TEXT,
ADD COLUMN IF NOT EXISTS logo_dark TEXT;