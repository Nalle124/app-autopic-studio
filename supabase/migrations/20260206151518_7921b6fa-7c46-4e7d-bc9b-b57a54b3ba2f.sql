
-- Create draft_images table for cross-device image persistence
CREATE TABLE public.draft_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  original_filename text NOT NULL,
  original_width integer,
  original_height integer,
  registration_number text,
  car_adjustments jsonb,
  crop_data jsonb,
  cropped_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.draft_images ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own drafts
CREATE POLICY "Users can view own drafts"
  ON public.draft_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON public.draft_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON public.draft_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON public.draft_images FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policy: allow authenticated users to upload to drafts/ folder
CREATE POLICY "Users can upload draft images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'processed-cars' 
    AND (storage.foldername(name))[1] = 'drafts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Storage policy: allow users to read their own draft images
CREATE POLICY "Users can read own draft images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'processed-cars' 
    AND (storage.foldername(name))[1] = 'drafts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Storage policy: allow users to delete their own draft images
CREATE POLICY "Users can delete own draft images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'processed-cars' 
    AND (storage.foldername(name))[1] = 'drafts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
