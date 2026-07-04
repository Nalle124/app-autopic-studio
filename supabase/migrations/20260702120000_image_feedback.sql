-- Per-image quality feedback (thumbs up/down) from the result gallery.
-- Denormalizes engine + scene so engine/scene quality can be analyzed
-- without joining processing_jobs.
CREATE TABLE public.image_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  engine TEXT,
  scene_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

ALTER TABLE public.image_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.image_feedback FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own feedback"
  ON public.image_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.image_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
  ON public.image_feedback FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_image_feedback_engine ON public.image_feedback (engine, rating);
