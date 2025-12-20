-- Add thumbnail_url column to processing_jobs for faster gallery loading
ALTER TABLE public.processing_jobs 
ADD COLUMN thumbnail_url text;