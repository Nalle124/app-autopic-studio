INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'wood-slat-studio',
  'Wood slat studio',
  'Modern studio med vertikala trälameller och polerat betonggolv med naturligt dagsljus',
  'ljusa studios',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/wood-slat-studio.jpg',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/wood-slat-studio.jpg',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.4, 0.5,
  'Place the vehicle on the polished concrete floor in the modern studio. Vertical light oak wood slat wall. Natural daylight. Clean minimal Scandinavian aesthetic.',
  'none',
  1.0,
  0
);