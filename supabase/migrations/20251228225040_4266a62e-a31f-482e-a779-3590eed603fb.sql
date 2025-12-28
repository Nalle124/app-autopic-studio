-- Fix the foreign key constraint on processing_jobs to cascade on user delete
ALTER TABLE public.processing_jobs 
DROP CONSTRAINT IF EXISTS processing_jobs_user_id_fkey;

ALTER TABLE public.processing_jobs 
ADD CONSTRAINT processing_jobs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;