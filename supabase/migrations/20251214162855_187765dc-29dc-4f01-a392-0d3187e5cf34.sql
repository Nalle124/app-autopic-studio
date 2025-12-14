INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'nordic-showroom',
  'Nordic Showroom',
  'Skandinavisk studio med träspalt och geometriskt takljus',
  'studio-light',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/nordic-showroom.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/nordic-showroom.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.5, 0.5,
  'Place the vehicle on the polished concrete floor. Warm wooden slat wall on left side. Grey concrete wall on right. Geometric LED ceiling lights. Modern showroom atmosphere.',
  'none',
  1.0,
  0
);