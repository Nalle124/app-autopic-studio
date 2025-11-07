-- Create storage bucket for processed images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'processed-cars',
  'processed-cars',
  true,
  20971520, -- 20MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Create RLS policies for the bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'processed-cars');

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'processed-cars');

-- Create table to track processing jobs
CREATE TABLE public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  segmented_url TEXT,
  final_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on processing_jobs
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to processing jobs
CREATE POLICY "Allow public read"
ON public.processing_jobs FOR SELECT
USING (true);

-- Allow public insert
CREATE POLICY "Allow public insert"
ON public.processing_jobs FOR INSERT
WITH CHECK (true);