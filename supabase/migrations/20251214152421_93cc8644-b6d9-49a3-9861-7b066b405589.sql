INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'clean-wood-studio',
  'Clean wood studio',
  'Modern studio med ljusa träväggar, betonggolv och stora fönster med naturligt dagsljus',
  'studio',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/clean-wood-studio.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/clean-wood-studio.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.35, 0.5,
  'Place the vehicle on the light grey concrete tile floor in the modern studio. Natural daylight from large windows. Light oak wood panels on walls. Clean, minimal Scandinavian aesthetic.',
  'none',
  1.0,
  0
);