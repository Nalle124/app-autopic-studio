-- Create scenes table with categories
CREATE TABLE IF NOT EXISTS public.scenes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'studio',
  thumbnail_url TEXT NOT NULL,
  full_res_url TEXT NOT NULL,
  horizon_y NUMERIC NOT NULL DEFAULT 52,
  baseline_y NUMERIC NOT NULL DEFAULT 70,
  default_scale NUMERIC NOT NULL DEFAULT 0.65,
  shadow_enabled BOOLEAN NOT NULL DEFAULT false,
  shadow_strength NUMERIC NOT NULL DEFAULT 0,
  shadow_blur NUMERIC NOT NULL DEFAULT 0,
  shadow_offset_x NUMERIC NOT NULL DEFAULT 0,
  shadow_offset_y NUMERIC NOT NULL DEFAULT 0,
  reflection_enabled BOOLEAN NOT NULL DEFAULT false,
  reflection_opacity NUMERIC NOT NULL DEFAULT 0,
  reflection_fade NUMERIC NOT NULL DEFAULT 0,
  ai_prompt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- Everyone can read scenes
CREATE POLICY "Anyone can view scenes"
  ON public.scenes
  FOR SELECT
  USING (true);

-- Only admins can manage scenes
CREATE POLICY "Admins can insert scenes"
  ON public.scenes
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update scenes"
  ON public.scenes
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete scenes"
  ON public.scenes
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_scenes_updated_at
  BEFORE UPDATE ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert existing scenes into the database
INSERT INTO public.scenes (id, name, description, category, thumbnail_url, full_res_url, horizon_y, baseline_y, default_scale, shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y, reflection_enabled, reflection_opacity, reflection_fade, ai_prompt, sort_order) VALUES
  ('dark-studio', 'Grå Studio', 'Mörk studiomiljö med träpanel och reflektion', 'studio', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dark-studio.png', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dark-studio.png', 52, 73, 0.65, false, 0, 0, 0, 0, true, 0.575, 0.75, null, 1),
  ('ljus-marmor', 'Ljus Marmor', 'Ljust marmorgolv med reflektion', 'studio', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/marmorljus-new.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/marmorljus-new.jpg', 52, 70, 0.65, false, 0, 0, 0, 0, true, 0.6, 0.7, null, 2),
  ('outdoor-park', 'Park', 'Utomhusmiljö med träd och skugga', 'utomhus', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/outdoor-park.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/outdoor-park.jpg', 48, 70, 0.6, true, 0.4, 30, 2, 3, false, 0, 0, null, 3),
  ('contrast', 'Contrast', 'Kontraststudio med trägolv och reflektion', 'studio', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/contrast-new.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/contrast-new.jpg', 52, 72, 0.65, false, 0, 0, 0, 0, true, 0.55, 0.75, null, 4),
  ('vit-kakel', 'Vit Kakel', 'Vit minimalistisk kakel med reflektion', 'studio', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/vit-kakel-new.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/vit-kakel-new.jpg', 55, 75, 0.65, false, 0, 0, 0, 0, true, 0.5, 0.8, null, 5),
  ('dark-curtain', 'Mörkt Draperi', 'Mörkt draperi med varm belysning och reflektion', 'studio', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dark-curtain.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dark-curtain.jpg', 50, 72, 0.65, false, 0, 0, 0, 0, true, 0.65, 0.7, 'Place the vehicle in a dramatic studio with dark curtain backdrop and warm lighting, with clear floor reflection', 6),
  ('plattform', 'Plattform', 'Cirkulär plattform med naturlig skugga', 'fancy', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/plattform.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/plattform.jpg', 48, 68, 0.55, true, 0.45, 35, 0, 4, false, 0, 0, 'Place the vehicle centered on the circular platform on the ground, maintaining the platform surface beneath it', 7);