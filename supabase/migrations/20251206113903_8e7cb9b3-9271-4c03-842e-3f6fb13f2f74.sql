-- Add RLS policy for users to delete their own processing jobs
CREATE POLICY "Users can delete their own jobs" 
ON public.processing_jobs 
FOR DELETE 
USING (auth.uid() = user_id);