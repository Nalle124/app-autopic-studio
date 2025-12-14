INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'glas-walls',
  'Glas walls',
  'Industriell studio med svarta glasväggar, vit tegelvägg, polerat betonggolv och industriella taklampor',
  'ljusa studios',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/glas-walls.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/glas-walls.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.4, 0.5,
  'Place the vehicle on the polished concrete floor in the industrial studio. Black steel-framed glass partition walls. White painted brick wall on the right. Industrial pendant lights hang from exposed ceiling. Clean modern aesthetic.',
  'none',
  1.0,
  0
);