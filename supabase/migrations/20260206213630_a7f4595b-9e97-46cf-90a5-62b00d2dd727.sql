
-- Create user_scenes table for AI-generated personal backgrounds
CREATE TABLE public.user_scenes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Min bakgrund',
  description text,
  prompt text NOT NULL,
  thumbnail_url text,
  full_res_url text,
  horizon_y numeric NOT NULL DEFAULT 50,
  baseline_y numeric NOT NULL DEFAULT 65,
  default_scale numeric NOT NULL DEFAULT 0.65,
  shadow_enabled boolean NOT NULL DEFAULT true,
  shadow_strength numeric NOT NULL DEFAULT 0.6,
  shadow_blur numeric NOT NULL DEFAULT 15,
  shadow_offset_x numeric NOT NULL DEFAULT 0,
  shadow_offset_y numeric NOT NULL DEFAULT 5,
  photoroom_shadow_mode text NOT NULL DEFAULT 'ai.soft',
  reflection_enabled boolean NOT NULL DEFAULT false,
  reflection_opacity numeric NOT NULL DEFAULT 0,
  reflection_fade numeric NOT NULL DEFAULT 0,
  reference_scale numeric NOT NULL DEFAULT 0.85,
  ai_prompt text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_scenes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own scenes
CREATE POLICY "Users can view their own scenes"
ON public.user_scenes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenes"
ON public.user_scenes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenes"
ON public.user_scenes FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenes"
ON public.user_scenes FOR UPDATE
USING (auth.uid() = user_id);
