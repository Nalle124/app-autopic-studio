
INSERT INTO public.scenes (
  id, name, description, category,
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  photoroom_shadow_mode, reference_scale, sort_order,
  ai_prompt
) VALUES (
  'morkbla-studio-premium',
  'Mörkblå Studio Premium',
  'Dramatisk mörkblå gradient med grått golv',
  'premium',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/morkbla-studio-premium.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/morkbla-studio-premium.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  false, 0, 0,
  'ai.soft', 1.0, 0,
  'Professional photography studio with dramatic deep dark blue gradient background wall, smooth glossy grey concrete floor, soft diffused lighting, premium automotive showroom atmosphere, luxury car photography'
);
